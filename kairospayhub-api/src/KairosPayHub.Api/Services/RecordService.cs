using KairosPayHub.Api.Data;
using KairosPayHub.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace KairosPayHub.Api.Services;

public record SubmitRecordInput(
    Guid ChurchId,
    decimal Amount,
    DateTimeOffset DateSent,
    PaymentMethod Method,
    string? Reference = null,
    string? Currency = null);

public record RecordFilters(Guid? ChurchId = null, RecordStatus? Status = null);

public class RecordService(KairosDbContext db, ChurchService churches)
{
    public async Task<Record> SubmitAsync(
        Actor actor,
        SubmitRecordInput input,
        CancellationToken ct = default)
    {
        var church = await churches.FindInOrgAsync(actor, input.ChurchId, ct);
        if (church is null)
            throw new ForbiddenException("Church not found in your organization");

        if (actor.Role == Role.Leader && actor.ChurchId != input.ChurchId)
            throw new ForbiddenException("Leaders can only submit for their own church");

        var record = new Record
        {
            OrganizationId = actor.OrganizationId,
            ChurchId = input.ChurchId,
            SubmittedById = actor.Id,
            Amount = input.Amount,
            Currency = string.IsNullOrWhiteSpace(input.Currency) ? "GHS" : input.Currency,
            DateSent = input.DateSent,
            Method = input.Method,
            Reference = input.Reference,
        };
        db.Records.Add(record);
        await db.SaveChangesAsync(ct);
        return record;
    }

    public Task<List<Record>> ListAsync(
        Actor actor,
        RecordFilters? filters = null,
        CancellationToken ct = default)
    {
        filters ??= new RecordFilters();
        var query = db.Records.Where(r => r.OrganizationId == actor.OrganizationId);

        if (actor.Role == Role.Leader)
        {
            if (actor.ChurchId is null)
                return Task.FromResult(new List<Record>());
            query = query.Where(r => r.ChurchId == actor.ChurchId);
        }
        else if (filters.ChurchId is { } churchId)
        {
            query = query.Where(r => r.ChurchId == churchId);
        }

        if (filters.Status is { } status)
            query = query.Where(r => r.Status == status);

        return query.OrderByDescending(r => r.DateSent).ToListAsync(ct);
    }

    public async Task<Record> VerifyAsync(Actor actor, Guid recordId, CancellationToken ct = default)
    {
        var record = await LoadInOrgAsync(actor, recordId, ct);
        var patch = RecordAuthorization.VerifyRecord(ToAuthz(record), actor);

        record.Status = patch.Status;
        record.VerifiedById = patch.VerifiedById;
        record.VerifiedAt = patch.VerifiedAt;
        await db.SaveChangesAsync(ct);
        return record;
    }

    public async Task DeleteAsync(Actor actor, Guid recordId, CancellationToken ct = default)
    {
        var record = await LoadInOrgAsync(actor, recordId, ct);
        if (!RecordAuthorization.CanEditRecord(ToAuthz(record), actor))
            throw new ForbiddenException("Cannot delete this record");

        db.Records.Remove(record);
        await db.SaveChangesAsync(ct);
    }

    private async Task<Record> LoadInOrgAsync(Actor actor, Guid recordId, CancellationToken ct)
    {
        var record = await db.Records.FirstOrDefaultAsync(
            r => r.Id == recordId && r.OrganizationId == actor.OrganizationId, ct);
        if (record is null)
            throw new ForbiddenException("Record not found");
        return record;
    }

    private static RecordForAuthz ToAuthz(Record r) =>
        new(r.Id, r.OrganizationId, r.SubmittedById, r.Status);
}
