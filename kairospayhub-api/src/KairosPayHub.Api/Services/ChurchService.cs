using KairosPayHub.Api.Data;
using KairosPayHub.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace KairosPayHub.Api.Services;

public class ChurchService(KairosDbContext db)
{
    public Task<List<Church>> ListAsync(Actor actor, CancellationToken ct = default) =>
        db.Churches
            .Where(c => c.OrganizationId == actor.OrganizationId)
            .OrderBy(c => c.Name)
            .ToListAsync(ct);

    public async Task<Church> CreateAsync(Actor actor, string name, CancellationToken ct = default)
    {
        if (actor.Role != Role.Pastor)
            throw new ForbiddenException("Only a pastor can add churches");

        var church = new Church { OrganizationId = actor.OrganizationId, Name = name };
        db.Churches.Add(church);
        await db.SaveChangesAsync(ct);
        return church;
    }

    public Task<Church?> FindInOrgAsync(Actor actor, Guid churchId, CancellationToken ct = default) =>
        db.Churches.FirstOrDefaultAsync(
            c => c.Id == churchId && c.OrganizationId == actor.OrganizationId, ct);
}
