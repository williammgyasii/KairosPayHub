using KairosPayHub.Api.Domain.Media;
using KairosPayHub.Api.Services;

namespace KairosPayHub.Tests.Unit;

public class ServiceRecordingPolicyTests
{
    [Fact]
    public void Members_only_see_published_ready_recordings()
    {
        Assert.True(ServiceRecordingPolicy.IsVisibleToMembers(ServiceRecordingStatus.Ready, DateTimeOffset.UtcNow));
        Assert.False(ServiceRecordingPolicy.IsVisibleToMembers(ServiceRecordingStatus.Ready, null));
        Assert.False(ServiceRecordingPolicy.IsVisibleToMembers(ServiceRecordingStatus.Processing, DateTimeOffset.UtcNow));
    }

    [Fact]
    public void Manager_can_preview_ready_unpublished_playback()
    {
        Assert.True(ServiceRecordingPolicy.CanWatchPlayback(
            canManageChurch: true,
            ServiceRecordingStatus.Ready,
            publishedAt: null));
    }

    [Fact]
    public void Member_cannot_watch_unpublished_playback()
    {
        Assert.False(ServiceRecordingPolicy.CanWatchPlayback(
            canManageChurch: false,
            ServiceRecordingStatus.Ready,
            publishedAt: null));
    }

    [Fact]
    public void Member_can_watch_published_ready_playback()
    {
        Assert.True(ServiceRecordingPolicy.CanWatchPlayback(
            canManageChurch: false,
            ServiceRecordingStatus.Ready,
            DateTimeOffset.UtcNow));
    }

    [Fact]
    public void Only_manager_can_publish_ready_unpublished()
    {
        Assert.True(ServiceRecordingPolicy.CanPublish(true, ServiceRecordingStatus.Ready, null));
        Assert.False(ServiceRecordingPolicy.CanPublish(false, ServiceRecordingStatus.Ready, null));
        Assert.False(ServiceRecordingPolicy.CanPublish(true, ServiceRecordingStatus.Processing, null));
        Assert.False(ServiceRecordingPolicy.CanPublish(true, ServiceRecordingStatus.Ready, DateTimeOffset.UtcNow));
    }

    [Fact]
    public void List_visibility_matches_actor_role()
    {
        var publishedAt = DateTimeOffset.UtcNow;
        Assert.True(ServiceRecordingPolicy.CanViewInList(false, ServiceRecordingStatus.Ready, publishedAt));
        Assert.False(ServiceRecordingPolicy.CanViewInList(false, ServiceRecordingStatus.Draft, null));
        Assert.True(ServiceRecordingPolicy.CanViewInList(true, ServiceRecordingStatus.Draft, null));
    }
}
