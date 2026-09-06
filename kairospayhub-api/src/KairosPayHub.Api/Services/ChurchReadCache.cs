using Microsoft.Extensions.Caching.Memory;

namespace KairosPayHub.Api.Services;

/// <summary>
/// Short-lived in-memory cache for expensive per-church reads (structure tree, giving dashboard).
/// </summary>
public class ChurchReadCache(IMemoryCache cache)
{
    public static readonly TimeSpan StructureTreeTtl = TimeSpan.FromSeconds(60);
    public static readonly TimeSpan GivingDashboardTtl = TimeSpan.FromSeconds(30);
    public static readonly TimeSpan ScheduledActivationCheckTtl = TimeSpan.FromSeconds(60);

    public async Task<T> GetOrCreateAsync<T>(
        string key,
        TimeSpan ttl,
        Func<CancellationToken, Task<T>> factory,
        CancellationToken ct = default)
    {
        if (cache.TryGetValue(key, out T? hit) && hit is not null)
            return hit;

        var value = await factory(ct);
        cache.Set(key, value, ttl);
        return value;
    }

    public bool ShouldSkipScheduledActivation(Guid churchId) =>
        cache.TryGetValue(ScheduledActivationKey(churchId), out _);

    public void MarkScheduledActivationChecked(Guid churchId) =>
        cache.Set(ScheduledActivationKey(churchId), true, ScheduledActivationCheckTtl);

    public void InvalidateStructureTree(Guid churchId) =>
        Bump(StructureVersionKey(churchId));

    public void InvalidateGivingDashboard(Guid churchId) =>
        Bump(GivingDashboardVersionKey(churchId));

    public string StructureTreeKey(
        Guid churchId,
        Guid authUserId,
        string role,
        bool includeMembers) =>
        $"structure-tree:{churchId}:{authUserId}:{role}:{includeMembers}:v{GetVersion(StructureVersionKey(churchId))}";

    public string GivingDashboardKey(Guid churchId, Guid authUserId, string role) =>
        $"giving-dashboard:{churchId}:{authUserId}:{role}:v{GetVersion(GivingDashboardVersionKey(churchId))}";

    private void Bump(string versionKey) =>
        cache.Set(versionKey, GetVersion(versionKey) + 1, TimeSpan.FromHours(24));

    private int GetVersion(string versionKey) =>
        cache.TryGetValue(versionKey, out int version) ? version : 0;

    private static string ScheduledActivationKey(Guid churchId) =>
        $"giving-activation-checked:{churchId}";

    private static string StructureVersionKey(Guid churchId) =>
        $"structure-version:{churchId}";

    private static string GivingDashboardVersionKey(Guid churchId) =>
        $"giving-dashboard-version:{churchId}";
}
