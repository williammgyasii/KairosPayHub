using KairosPayHub.Api.Auth;
using KairosPayHub.Api.Domain;
using KairosPayHub.Api.Services;
using KairosPayHub.Api.Web;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace KairosPayHub.Api.Controllers;

[ApiController]
[Route("api/records")]
[Authorize]
public class RecordsController(CurrentActor current, RecordService records) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List(
        [FromQuery] Guid? churchId,
        [FromQuery] RecordStatus? status,
        CancellationToken ct)
    {
        var actor = await current.RequireAsync(ct);
        var list = await records.ListAsync(actor, new RecordFilters(churchId, status), ct);
        return Ok(list.Select(r => r.ToDto()));
    }

    [HttpPost]
    public async Task<IActionResult> Submit([FromBody] SubmitRecordRequest request, CancellationToken ct)
    {
        var actor = await current.RequireAsync(ct);
        var input = new SubmitRecordInput(
            request.ChurchId,
            request.Amount,
            request.DateSent,
            request.Method,
            request.Reference,
            request.Currency);
        var record = await records.SubmitAsync(actor, input, ct);
        return Ok(record.ToDto());
    }

    [HttpPost("{id:guid}/verify")]
    public async Task<IActionResult> Verify(Guid id, CancellationToken ct)
    {
        var actor = await current.RequireAsync(ct);
        var record = await records.VerifyAsync(actor, id, ct);
        return Ok(record.ToDto());
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var actor = await current.RequireAsync(ct);
        await records.DeleteAsync(actor, id, ct);
        return NoContent();
    }
}
