using KairosPayHub.Api.Data;
using KairosPayHub.Api.Domain.Outreach;
using Microsoft.EntityFrameworkCore;

namespace KairosPayHub.Api.Outreach;

public class OutreachLeadService(KairosDbContext db)
{
    public Task<LeadPage> PageAsync(string? state, string? city, int page, int pageSize, CancellationToken ct)
    {
        var query = db.OutreachChurches.AsQueryable();
        if (!string.IsNullOrWhiteSpace(state))
            query = query.Where(church => church.State == state);
        if (!string.IsNullOrWhiteSpace(city))
            query = query.Where(church => church.City == city);
        return PageQueryAsync(query, page, pageSize, ct);
    }

    public Task<LeadPage> SavedPageAsync(int page, int pageSize, CancellationToken ct) =>
        PageQueryAsync(db.OutreachChurches.Where(church => church.Saved), page, pageSize, ct);

    public Task<LeadPage> ReachedPageAsync(int page, int pageSize, CancellationToken ct) =>
        PageQueryAsync(db.OutreachChurches.Where(church => church.Saved && church.SentAt != null), page, pageSize, ct);

    public async Task<LeadMetrics> MetricsAsync(CancellationToken ct)
    {
        var counts = await db.OutreachChurches
            .Where(church => church.Saved)
            .GroupBy(church => church.Status)
            .Select(group => new { group.Key, Count = group.Count() })
            .ToListAsync(ct);
        int Count(string status) => counts.FirstOrDefault(row => row.Key == status)?.Count ?? 0;
        var scouted = Count(LeadStatus.Scouted);
        var responded = Count(LeadStatus.Responded);
        var converted = Count(LeadStatus.Converted);
        var success = Count(LeadStatus.Success);
        var failure = Count(LeadStatus.Failure);
        return new LeadMetrics(scouted + responded + converted + success + failure, scouted, responded, converted, success, failure);
    }

    public Task<OutreachChurch?> FindSavedAsync(Guid id, CancellationToken ct) =>
        db.OutreachChurches.FirstOrDefaultAsync(church => church.Id == id && church.Saved, ct);

    public async Task MarkSentAsync(OutreachChurch row, string subject, string body, CancellationToken ct)
    {
        row.SentAt = DateTimeOffset.UtcNow;
        row.SentSubject = subject;
        row.SentBody = body;
        row.UpdatedAt = row.SentAt.Value;
        await db.SaveChangesAsync(ct);
    }

    public async Task<OutreachChurch?> SaveAsync(Guid id, CancellationToken ct)
    {
        var row = await db.OutreachChurches.FirstOrDefaultAsync(church => church.Id == id, ct);
        if (row is null) return null;
        row.Saved = true;
        row.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);
        return row;
    }

    public Task<List<OutreachChurch>> ListAsync(CancellationToken ct) =>
        db.OutreachChurches.OrderByDescending(church => church.UpdatedAt).ToListAsync(ct);

    public async Task<OutreachChurch?> MarkAsync(Guid id, string? status, CancellationToken ct)
    {
        if (!LeadStatus.IsKnown(status)) return null;
        var row = await db.OutreachChurches.FirstOrDefaultAsync(church => church.Id == id, ct);
        if (row is null) return null;
        row.Status = status!;
        row.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);
        return row;
    }

    private static async Task<LeadPage> PageQueryAsync(IQueryable<OutreachChurch> query, int page, int pageSize, CancellationToken ct)
    {
        var total = await query.CountAsync(ct);
        var rows = await query
            .OrderByDescending(church => church.UpdatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);
        return new LeadPage(rows, total, page, pageSize);
    }
}

public sealed record LeadPage(IReadOnlyList<OutreachChurch> Churches, int TotalCount, int Page, int PageSize);

public sealed record LeadMetrics(int Total, int Scouted, int Responded, int Converted, int Success, int Failure);
