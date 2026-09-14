using KairosPayHub.Api.Auth;
using KairosPayHub.Api.Authorization;
using KairosPayHub.Api.Data;
using KairosPayHub.Api.Domain;
using KairosPayHub.Api.Domain.Structure;
using KairosPayHub.Api.FeatureFlags;
using KairosPayHub.Api.Services;
using KairosPayHub.Api.Storage;
using KairosPayHub.Api.Web;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace KairosPayHub.Api.Controllers;

[ApiController]
[Route("api/me")]
[Authorize]
public class MeController(
    CurrentActor current,
    KairosDbContext db,
    AbilityResolver abilities,
    LayerAccessService layerAccess,
    UserManager<ApplicationUser> users,
    ChurchReadCache readCache,
    UserAvatarService avatars,
    IOptions<ServiceRecordingsFeatureOptions> serviceRecordingsFeature) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken ct)
    {
        var actor = await current.TryGetAsync(ct);
        if (actor is null)
        {
            return Ok(new
            {
                onboarded = false,
                email = current.Email,
                name = current.Name,
            });
        }

        var churchId = actor.StructureChurchId != default ? actor.StructureChurchId : (Guid?)null;
        var hasStructureTemplate = churchId is not null
            && await db.StructureTemplates.AsNoTracking().AnyAsync(t => t.ChurchId == churchId, ct);

        string? churchName = null;
        string? churchLogoUrl = null;
        string? location = null;
        string? pastorName = null;
        int? memberCount = null;
        string? countryCode = null;
        string? defaultCurrency = null;
        string? timeZoneId = null;
        if (churchId is not null)
        {
            var church = await db.StructureChurches.AsNoTracking()
                .Where(c => c.Id == churchId)
                .Select(c => new
                {
                    c.Name,
                    c.LogoUrl,
                    c.Location,
                    c.PrimaryPastorName,
                    c.ApproximateMemberCount,
                    c.CountryCode,
                    c.DefaultCurrency,
                    c.TimeZoneId,
                })
                .FirstOrDefaultAsync(ct);
            churchName = church?.Name;
            churchLogoUrl = church?.LogoUrl;
            location = church?.Location;
            pastorName = church?.PrimaryPastorName;
            memberCount = church?.ApproximateMemberCount;
            countryCode = church?.CountryCode;
            defaultCurrency = church?.DefaultCurrency;
            timeZoneId = church?.TimeZoneId;
        }

        if (actor.StructureRole == ChurchRole.Pastor
            && churchId is not null
            && !hasStructureTemplate)
        {
            var pending = abilities.Resolve(actor.StructureRole);
            return Ok(new
            {
                onboarded = false,
                email = current.Email,
                name = current.Name,
                churchId,
                churchName,
                location,
                pastorName,
                memberCount,
                countryCode,
                defaultCurrency,
                timeZoneId,
                onboardingStep = "structure",
                role = actor.StructureRole?.ToString() ?? actor.Role.ToString(),
                abilities = pending.Abilities,
                abilityRules = pending.Rules,
                leadershipProfile = pending.Profile.ToString(),
            });
        }

        var role = actor.StructureRole?.ToString() ?? actor.Role.ToString();

        Guid? scopeNodeId = null;
        string? scopeUnitName = null;
        StructureLayerType? scopeLayerKind = null;
        object rollCallScopes = Array.Empty<object>();
        var canMarkAttendance = false;
        if (actor.StructureRole is not null
            && actor.StructureChurchId != default
            && Guid.TryParse(current.Sub, out var authUserId))
        {
            var scopedNodeId = await db.RoleAssignments.AsNoTracking()
                .Where(r =>
                    r.ChurchId == actor.StructureChurchId
                    && r.AuthUserId == authUserId
                    && r.Role == actor.StructureRole)
                .Select(r => r.ScopeNodeId)
                .FirstOrDefaultAsync(ct);

            if (scopedNodeId is Guid nodeId)
            {
                scopeNodeId = nodeId;
                var nodeInfo = await (
                    from n in db.StructureNodes.AsNoTracking()
                    join layer in db.StructureLayers.AsNoTracking() on n.LayerId equals layer.Id
                    where n.Id == nodeId && n.ChurchId == actor.StructureChurchId
                    select new { n.Name, layer.StandardType })
                    .FirstOrDefaultAsync(ct);
                scopeUnitName = nodeInfo?.Name;
                scopeLayerKind = nodeInfo?.StandardType;
            }

            var scopeRows = await (
                from assignment in db.RoleAssignments.AsNoTracking()
                join node in db.StructureNodes.AsNoTracking()
                    on assignment.ScopeNodeId equals node.Id
                join layer in db.StructureLayers.AsNoTracking()
                    on node.LayerId equals layer.Id
                where assignment.ChurchId == actor.StructureChurchId
                    && assignment.AuthUserId == authUserId
                    && assignment.ScopeNodeId != null
                orderby layer.SortOrder, node.Name
                select new
                {
                    scopeNodeId = node.Id,
                    scopeUnitName = node.Name,
                    layerId = layer.Id,
                    layerName = layer.DisplayName,
                })
                .ToListAsync(ct);
            rollCallScopes = scopeRows;

            if (scopeRows.Count > 0)
            {
                var ledLayerIds = scopeRows.Select(s => s.layerId).Distinct().ToList();
                canMarkAttendance = await db.AttendanceMeetingTypes.AsNoTracking()
                    .AnyAsync(
                        t => t.ChurchId == actor.StructureChurchId
                            && t.IsActive
                            && t.SubmissionLayerId != null
                            && ledLayerIds.Contains(t.SubmissionLayerId.Value),
                        ct);
            }
        }

        Guid.TryParse(current.Sub, out var resolveAuthUserId);
        var resolved = await layerAccess.ResolveForAsync(actor, resolveAuthUserId, ct);
        var linked = churchId is Guid linkedChurchId
            ? await FindLinkedMemberAsync(linkedChurchId, ct)
            : null;

        string? avatarUrl = null;
        if (Guid.TryParse(current.Sub, out var meAuthUserId))
            avatarUrl = await avatars.GetAvatarUrlAsync(meAuthUserId);

        var serviceRecordingsEnabled = ServiceRecordingFeaturePolicy.IsEnabled(
            serviceRecordingsFeature.Value,
            churchId);

        return Ok(new
        {
            onboarded = true,
            id = actor.Id,
            churchId,
            churchName,
            churchLogoUrl,
            avatarUrl,
            countryCode,
            defaultCurrency,
            timeZoneId,
            organizationId = actor.OrganizationId,
            role,
            scopeNodeId,
            scopeUnitName,
            rollCallScopes,
            canMarkAttendance,
            legacyChurchId = actor.ChurchId,
            email = current.Email,
            name = linked?.Name ?? current.Name,
            memberId = linked?.Id,
            phone = linked?.Phone,
            dateOfBirth = linked?.DateOfBirth,
            residence = linked?.Residence,
            state = linked?.State,
            occupationStatus = linked?.OccupationStatus?.ToString(),
            schoolOrWorkplace = linked?.SchoolOrWorkplace,
            workplace = linked?.Workplace,
            abilities = resolved.Abilities,
            abilityRules = resolved.Rules,
            leadershipProfile = resolved.Profile.ToString(),
            features = new { serviceRecordings = serviceRecordingsEnabled },
        });
    }

    [HttpPost("avatar")]
    [RequestSizeLimit(2_621_440)]
    public async Task<IActionResult> UploadAvatar(IFormFile file, CancellationToken ct)
    {
        if (file is null || file.Length == 0)
            return BadRequest(new { error = "File is required" });

        if (!Guid.TryParse(current.Sub, out var authUserId))
            return Unauthorized();

        try
        {
            await using var stream = file.OpenReadStream();
            var url = await avatars.UploadAvatarAsync(
                authUserId,
                current.Email,
                current.Name,
                stream,
                file.ContentType,
                file.Length,
                ct);
            return Ok(new { avatarUrl = url });
        }
        catch (ObjectStorageNotConfiguredException)
        {
            return StatusCode(503, new { error = "File storage is not configured on the server" });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPatch]
    public async Task<IActionResult> Patch([FromBody] UpdateMeProfileRequest request, CancellationToken ct)
    {
        var actor = await current.RequireAsync(ct);
        var churchId = actor.StructureChurchId != default
            ? actor.StructureChurchId
            : throw new BadRequestException("You are not on the roster");

        var member = await FindLinkedMemberAsync(churchId, ct)
            ?? throw new BadRequestException("You are not on the roster");

        if (string.IsNullOrWhiteSpace(request.Name))
            throw new BadRequestException("Name is required");

        member.Name = request.Name.Trim();
        member.Phone = string.IsNullOrWhiteSpace(request.Phone) ? null : request.Phone.Trim();
        member.DateOfBirth = request.DateOfBirth;
        member.Residence = string.IsNullOrWhiteSpace(request.Residence) ? null : request.Residence.Trim();
        member.State = string.IsNullOrWhiteSpace(request.State) ? null : request.State.Trim();
        member.OccupationStatus = StructureMemberService.ParseMemberOccupationStatus(request.OccupationStatus);
        member.SchoolOrWorkplace = string.IsNullOrWhiteSpace(request.SchoolOrWorkplace)
            ? null
            : request.SchoolOrWorkplace.Trim();
        member.Workplace = string.IsNullOrWhiteSpace(request.Workplace) ? null : request.Workplace.Trim();

        if (member.AuthUserId is Guid authUserId)
        {
            var identity = await users.FindByIdAsync(authUserId.ToString());
            if (identity is not null)
            {
                identity.DisplayName = member.Name;
                await users.UpdateAsync(identity);
            }
        }

        await db.SaveChangesAsync(ct);
        readCache.InvalidateStructureTree(churchId);
        return await Get(ct);
    }

    private async Task<Member?> FindLinkedMemberAsync(Guid churchId, CancellationToken ct)
    {
        if (!Guid.TryParse(current.Sub, out var authUserId))
            return null;
        return await db.ChurchMembers
            .FirstOrDefaultAsync(m => m.ChurchId == churchId && m.AuthUserId == authUserId, ct);
    }
}
