using KairosPayHub.Api.Domain.Media;

namespace KairosPayHub.Api.Services;

public readonly record struct ServiceRecordingAccess(
    bool CanManage,
    bool CanPublish,
    bool CanUnpublish,
    bool CanDelete,
    bool CanWatchPlayback,
    bool CanViewInList,
    bool CanViewDetail);

public static class ServiceRecordingPolicy
{
    public const int MaxDurationMinutes = 120;
    public const long MaxFileBytes = 2L * 1024 * 1024 * 1024;
    public const int DefaultRetentionWeeks = 12;

    public static DateTimeOffset RetentionExpiresFromNow(DateTimeOffset now) =>
        now.AddDays(DefaultRetentionWeeks * 7);

    public static bool IsVisibleToMembers(ServiceRecordingStatus status, DateTimeOffset? publishedAt) =>
        publishedAt is not null && status == ServiceRecordingStatus.Ready;

    public static bool CanWatchPlayback(
        bool canManageChurch,
        ServiceRecordingStatus status,
        DateTimeOffset? publishedAt) =>
        status == ServiceRecordingStatus.Ready
        && (canManageChurch || publishedAt is not null);

    public static bool CanPublish(bool canManageChurch, ServiceRecordingStatus status, DateTimeOffset? publishedAt) =>
        canManageChurch
        && status == ServiceRecordingStatus.Ready
        && publishedAt is null;

    public static bool CanUnpublish(bool canManageChurch, DateTimeOffset? publishedAt) =>
        canManageChurch && publishedAt is not null;

    public static bool CanViewInList(
        bool canManageChurch,
        ServiceRecordingStatus status,
        DateTimeOffset? publishedAt) =>
        canManageChurch || IsVisibleToMembers(status, publishedAt);

    public static bool CanViewDetail(
        bool canManageChurch,
        ServiceRecordingStatus status,
        DateTimeOffset? publishedAt) =>
        CanViewInList(canManageChurch, status, publishedAt);

    public static ServiceRecordingAccess AccessFor(
        bool canManageChurch,
        ServiceRecordingStatus status,
        DateTimeOffset? publishedAt) =>
        new(
            CanManage: canManageChurch,
            CanPublish: CanPublish(canManageChurch, status, publishedAt),
            CanUnpublish: CanUnpublish(canManageChurch, publishedAt),
            CanDelete: canManageChurch,
            CanWatchPlayback: CanWatchPlayback(canManageChurch, status, publishedAt),
            CanViewInList: CanViewInList(canManageChurch, status, publishedAt),
            CanViewDetail: CanViewDetail(canManageChurch, status, publishedAt));

    public static ServiceRecordingStatus MapBunnyStatus(int bunnyStatus) =>
        bunnyStatus switch
        {
            5 => ServiceRecordingStatus.Failed,
            3 or 4 => ServiceRecordingStatus.Ready,
            _ => ServiceRecordingStatus.Processing,
        };
}
