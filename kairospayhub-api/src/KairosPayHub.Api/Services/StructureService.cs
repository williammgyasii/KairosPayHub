using KairosPayHub.Api.Auth;
using KairosPayHub.Api.Data;
using KairosPayHub.Api.Domain;
using KairosPayHub.Api.Domain.Structure;
using KairosPayHub.Api.Web;
using Microsoft.EntityFrameworkCore;

namespace KairosPayHub.Api.Services;

public class StructureService(KairosDbContext db)
{
    public async Task<StructureTreeDto> GetTreeAsync(Actor actor, CancellationToken ct = default)
    {
        var churchId = RequireStructureChurch(actor);

        var church = await db.StructureChurches.AsNoTracking()
            .SingleAsync(c => c.Id == churchId, ct);

        var pfccs = await db.Pfccs.AsNoTracking()
            .Where(p => p.ChurchId == churchId)
            .OrderBy(p => p.Name)
            .Select(p => new PfccDto(p.Id, p.Name))
            .ToListAsync(ct);

        var fellowships = await db.StructureFellowships.AsNoTracking()
            .Where(f => f.ChurchId == churchId)
            .OrderBy(f => f.Name)
            .Select(f => new FellowshipDto(f.Id, f.Name, f.PfccId))
            .ToListAsync(ct);

        var cells = await db.StructureCells.AsNoTracking()
            .Where(c => c.ChurchId == churchId)
            .OrderBy(c => c.Name)
            .Select(c => new CellDto(c.Id, c.Name, c.FellowshipId))
            .ToListAsync(ct);

        var members = await db.ChurchMembers.AsNoTracking()
            .Where(m => m.ChurchId == churchId)
            .OrderBy(m => m.Name)
            .Select(m => new MemberDto(m.Id, m.Name, m.CellId, m.Email, m.Phone))
            .ToListAsync(ct);

        return new StructureTreeDto(church.Id, church.Name, pfccs, fellowships, cells, members);
    }

    public async Task<PfccDto> CreatePfccAsync(Actor actor, string name, CancellationToken ct = default)
    {
        RequirePastor(actor);
        var churchId = RequireStructureChurch(actor);

        var pfcc = new Pfcc { ChurchId = churchId, Name = name.Trim() };
        db.Pfccs.Add(pfcc);
        await db.SaveChangesAsync(ct);
        return new PfccDto(pfcc.Id, pfcc.Name);
    }

    public async Task<FellowshipDto> CreateFellowshipAsync(
        Actor actor,
        string name,
        Guid? pfccId,
        CancellationToken ct = default)
    {
        RequirePastor(actor);
        var churchId = RequireStructureChurch(actor);

        if (pfccId is not null)
        {
            var pfccExists = await db.Pfccs.AnyAsync(
                p => p.Id == pfccId && p.ChurchId == churchId, ct);
            if (!pfccExists)
                throw new ForbiddenException("PFCC not found in your church");
        }

        var fellowship = new Fellowship
        {
            ChurchId = churchId,
            PfccId = pfccId,
            Name = name.Trim(),
        };
        db.StructureFellowships.Add(fellowship);
        await db.SaveChangesAsync(ct);
        return new FellowshipDto(fellowship.Id, fellowship.Name, fellowship.PfccId);
    }

    public async Task<CellDto> CreateCellAsync(
        Actor actor,
        string name,
        Guid fellowshipId,
        CancellationToken ct = default)
    {
        RequirePastor(actor);
        var churchId = RequireStructureChurch(actor);

        var fellowshipExists = await db.StructureFellowships.AnyAsync(
            f => f.Id == fellowshipId && f.ChurchId == churchId, ct);
        if (!fellowshipExists)
            throw new ForbiddenException("Fellowship not found in your church");

        var cell = new Cell
        {
            ChurchId = churchId,
            FellowshipId = fellowshipId,
            Name = name.Trim(),
        };
        db.StructureCells.Add(cell);
        await db.SaveChangesAsync(ct);
        return new CellDto(cell.Id, cell.Name, cell.FellowshipId);
    }

    public async Task<MemberDto> CreateMemberAsync(
        Actor actor,
        string name,
        Guid cellId,
        string? email,
        string? phone,
        CancellationToken ct = default)
    {
        RequirePastor(actor);
        var churchId = RequireStructureChurch(actor);

        var cellExists = await db.StructureCells.AnyAsync(
            c => c.Id == cellId && c.ChurchId == churchId, ct);
        if (!cellExists)
            throw new ForbiddenException("Cell not found in your church");

        var member = new Member
        {
            ChurchId = churchId,
            CellId = cellId,
            Name = name.Trim(),
            Email = string.IsNullOrWhiteSpace(email) ? null : email.Trim(),
            Phone = string.IsNullOrWhiteSpace(phone) ? null : phone.Trim(),
        };
        db.ChurchMembers.Add(member);
        await db.SaveChangesAsync(ct);
        return new MemberDto(member.Id, member.Name, member.CellId, member.Email, member.Phone);
    }

    private static Guid RequireStructureChurch(Actor actor)
    {
        if (actor.StructureChurchId == default)
            throw new NotOnboardedException("Church structure is not set up");
        return actor.StructureChurchId;
    }

    private static void RequirePastor(Actor actor)
    {
        if (actor.StructureRole != ChurchRole.Pastor && actor.Role != Role.Pastor)
            throw new ForbiddenException("Only a pastor can manage church structure");
    }
}
