using KairosPayHub.Api.Outreach;
using KairosPayHub.Api.Web;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace KairosPayHub.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/outreach")]
public class OutreachController(
    SuperadminSignIn operators,
    ITurnstileVerifier turnstile,
    OutreachScoutService scout,
    OutreachLeadService leads,
    ILocationGeocoder locations,
    ICityCatalog cities,
    IOutreachMailbox mailbox,
    OutreachSendClaims claims,
    IOutreachDraftWriter drafts) : ControllerBase
{
    [AllowAnonymous]
    [HttpPost("session")]
    public async Task<IActionResult> Session([FromBody] OperatorSessionRequest request, CancellationToken ct)
    {
        var blocked = await TurnstileGate.RejectUnlessValidAsync(
            this, turnstile, "login", request.TurnstileToken, ct);
        if (blocked is not null) return blocked;

        var token = await operators.SignInAsync(request.Email, request.Password, ct);
        if (token is null) return Unauthorized(new { error = "Invalid email or password" });
        return Ok(new { accessToken = token });
    }

    [HttpGet("access")]
    public async Task<IActionResult> Access(CancellationToken ct)
    {
        if (!await operators.IsOperatorAsync(User, ct)) return StatusCode(StatusCodes.Status403Forbidden);
        return Ok(new { allowed = true });
    }

    [HttpPost("searches")]
    public async Task<IActionResult> Search([FromBody] OutreachSearchRequest body, CancellationToken ct)
    {
        if (!await operators.IsOperatorAsync(User, ct)) return StatusCode(StatusCodes.Status403Forbidden);
        if (string.IsNullOrWhiteSpace(body.Area) && (string.IsNullOrWhiteSpace(body.City) || string.IsNullOrWhiteSpace(body.State)))
            return BadRequest(new { message = "Enter a city and state." });

        var area = string.IsNullOrWhiteSpace(body.Area)
            ? $"{body.City!.Trim()}, {body.State!.Trim()}"
            : body.Area.Trim();
        var page = body.Page is > 0 ? body.Page.Value : 1;
        var pageSize = body.PageSize is > 0 and <= 100 ? body.PageSize.Value : 10;
        var radius = body.RadiusMiles is > 0 and <= 100 ? body.RadiusMiles.Value : 25;

        try
        {
            LeadPage result;
            if (page == 1)
            {
                var rows = await scout.SearchAsync(area, ct, radius);
                result = new LeadPage(rows.Skip(0).Take(pageSize).ToList(), rows.Count, page, pageSize);
            }
            else
            {
                result = await leads.PageAsync(body.State, body.City, page, pageSize, ct);
            }

            return Ok(new
            {
                churches = result.Churches.Select(SearchJson),
                totalCount = result.TotalCount,
                page = result.Page,
                pageSize = result.PageSize,
            });
        }
        catch (OutreachAreaNotFoundException)
        {
            return BadRequest(new { message = "That area could not be found." });
        }
        catch (InvalidOperationException ex) when (ex.Message.Contains("OpenPlacesApiKey", StringComparison.Ordinal))
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new { message = "Church search is not configured." });
        }
    }

    [HttpGet("metrics")]
    public async Task<IActionResult> Metrics(CancellationToken ct)
    {
        if (!await operators.IsOperatorAsync(User, ct)) return StatusCode(StatusCodes.Status403Forbidden);
        var metrics = await leads.MetricsAsync(ct);
        return Ok(new
        {
            total = metrics.Total,
            scouted = metrics.Scouted,
            responded = metrics.Responded,
            converted = metrics.Converted,
            success = metrics.Success,
            failure = metrics.Failure,
        });
    }

    [HttpGet("churches")]
    public async Task<IActionResult> Churches([FromQuery] bool saved, [FromQuery] bool reached, [FromQuery] int? page, [FromQuery] int? pageSize, CancellationToken ct)
    {
        if (!await operators.IsOperatorAsync(User, ct)) return StatusCode(StatusCodes.Status403Forbidden);
        if (!saved)
        {
            var rows = await leads.ListAsync(ct);
            return Ok(new { churches = rows.Select(ChurchJson) });
        }

        var currentPage = page is > 0 ? page.Value : 1;
        var size = pageSize is > 0 and <= 100 ? pageSize.Value : 10;
        var result = reached
            ? await leads.ReachedPageAsync(currentPage, size, ct)
            : await leads.SavedPageAsync(currentPage, size, ct);
        return Ok(new
        {
            churches = result.Churches.Select(SearchJson),
            totalCount = result.TotalCount,
            page = result.Page,
            pageSize = result.PageSize,
        });
    }

    [HttpPost("churches/{id:guid}/save")]
    public async Task<IActionResult> Save(Guid id, CancellationToken ct)
    {
        if (!await operators.IsOperatorAsync(User, ct)) return StatusCode(StatusCodes.Status403Forbidden);
        var row = await leads.SaveAsync(id, ct);
        if (row is null) return NotFound();
        return Ok(new { saved = true });
    }

    [HttpPost("churches/{id:guid}/draft")]
    public async Task<IActionResult> Draft(Guid id, [FromBody] OutreachDraftRequest? body, CancellationToken ct)
    {
        if (!await operators.IsOperatorAsync(User, ct)) return StatusCode(StatusCodes.Status403Forbidden);
        var row = await leads.FindSavedAsync(id, ct);
        if (row is null) return NotFound();
        try
        {
            var draft = await drafts.WriteAsync(row, ct, body?.Instruction, body?.Subject, body?.Body);
            return Ok(new { subject = draft.Subject, body = draft.Body });
        }
        catch (InvalidOperationException ex)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new { message = ex.Message });
        }
    }

    [HttpPost("churches/{id:guid}/messages")]
    public async Task<IActionResult> ReachOut(
        Guid id,
        [FromHeader(Name = "Idempotency-Key")] string? key,
        [FromBody] OutreachMessageRequest body,
        CancellationToken ct)
    {
        if (!await operators.IsOperatorAsync(User, ct)) return StatusCode(StatusCodes.Status403Forbidden);
        if (string.IsNullOrWhiteSpace(key) || key.Length > 100)
            return BadRequest(new { message = "An Idempotency-Key header is required." });
        if (string.IsNullOrWhiteSpace(body.Subject) || string.IsNullOrWhiteSpace(body.Body))
            return BadRequest(new { message = "Write a subject and a message." });

        var (outcome, row) = await claims.ClaimAsync(id, key, ct);
        switch (outcome)
        {
            case Domain.Outreach.SendClaimOutcome.NotFound:
                return NotFound();
            case Domain.Outreach.SendClaimOutcome.Replay:
                return Ok(new { sent = true, sentAt = row!.SentAt });
            case Domain.Outreach.SendClaimOutcome.InProgress:
                return Conflict(new { message = "A send for this church is already in progress." });
        }

        var subject = body.Subject.Trim();
        var message = body.Body.Trim();
        try
        {
            await mailbox.SendAsync(row!.Email, subject, message, CancellationToken.None);
        }
        catch (Exception)
        {
            await claims.ReleaseAsync(id, key, CancellationToken.None);
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new { message = "The email could not be sent. Try again." });
        }

        var sentAt = await claims.CompleteAsync(id, key, subject, message, CancellationToken.None);
        return Ok(new { sent = true, sentAt });
    }

    [HttpPatch("churches/{id:guid}")]
    public async Task<IActionResult> Mark(Guid id, [FromBody] LeadStatusRequest body, CancellationToken ct)
    {
        if (!await operators.IsOperatorAsync(User, ct)) return StatusCode(StatusCodes.Status403Forbidden);
        if (!Domain.Outreach.LeadStatus.IsKnown(body.Status))
            return BadRequest(new { message = "Unknown lead status." });
        var row = await leads.MarkAsync(id, body.Status, ct);
        if (row is null) return NotFound();
        return Ok(new { status = row.Status });
    }

    [HttpGet("cities")]
    public async Task<IActionResult> Cities([FromQuery] string? state, CancellationToken ct)
    {
        if (!await operators.IsOperatorAsync(User, ct)) return StatusCode(StatusCodes.Status403Forbidden);
        if (string.IsNullOrWhiteSpace(state) || !CensusStateCodes.TryGetFips(state, out var fips))
            return BadRequest(new { message = "Choose a state." });
        var names = await cities.ListAsync(fips, ct);
        return Ok(new { cities = names });
    }

    [HttpPost("locations")]
    public async Task<IActionResult> Locate([FromBody] LocationRequest body, CancellationToken ct)
    {
        if (!await operators.IsOperatorAsync(User, ct)) return StatusCode(StatusCodes.Status403Forbidden);
        if (body.Latitude is null || body.Longitude is null)
            return BadRequest(new { message = "Location is required." });

        var place = await locations.LocateAsync(body.Latitude.Value, body.Longitude.Value, ct);
        if (place is null) return BadRequest(new { message = "That location could not be found." });
        return Ok(new { state = place.State, city = place.City });
    }

    private static object ChurchJson(Domain.Outreach.OutreachChurch row) => new
    {
        id = row.Id,
        name = row.Name,
        website = row.Website,
        email = row.Email,
        status = row.Status,
    };

    private static object SearchJson(Domain.Outreach.OutreachChurch row) => new
    {
        id = row.Id,
        name = row.Name,
        email = row.Email,
        website = row.Website,
        address = row.Address,
        city = row.City,
        state = row.State,
        radiusMiles = row.RadiusMiles,
        saved = row.Saved,
        status = row.Status,
        sentAt = row.SentAt,
        sentSubject = row.SentSubject,
        sentBody = row.SentBody,
    };

    public sealed record OperatorSessionRequest(string? Email, string? Password, string? TurnstileToken);
    public sealed record OutreachSearchRequest(string? Area, string? State, string? City, double? RadiusMiles, int? Page, int? PageSize);
    public sealed record LeadStatusRequest(string? Status);
    public sealed record OutreachMessageRequest(string? Subject, string? Body);
    public sealed record OutreachDraftRequest(string? Instruction, string? Subject, string? Body);
    public sealed record LocationRequest(double? Latitude, double? Longitude);
}
