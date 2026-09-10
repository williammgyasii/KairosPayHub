using KairosPayHub.Api.Domain;
using KairosPayHub.Api.Domain.Structure;

namespace KairosPayHub.Application.Structure;

/// <summary>
/// Church-manager command: wipe this church's structure and operational data.
/// Policy lives here; SQL lives behind <see cref="IChurchOperationalReset"/>.
/// </summary>
public sealed class DeleteStructureTemplate(IChurchOperationalReset reset)
{
    public async Task ExecuteAsync(Actor actor, CancellationToken ct = default)
    {
        if (!CanManageChurch(actor))
            throw new ForbiddenException("Only a pastor or church admin can manage church structure");
        if (actor.StructureChurchId == default)
            throw new NotOnboardedException("Church structure is not set up");

        await reset.ResetAsync(actor.StructureChurchId, ct);
    }

    /// <summary>
    /// Same rule as GivingScopeService.CanManageChurch — kept here so Application
    /// does not take a dependency on EF-backed services.
    /// </summary>
    private static bool CanManageChurch(Actor actor) =>
        actor.StructureRole is ChurchRole.Pastor or ChurchRole.ChurchAdmin
        || actor.Role == Role.Pastor;
}
