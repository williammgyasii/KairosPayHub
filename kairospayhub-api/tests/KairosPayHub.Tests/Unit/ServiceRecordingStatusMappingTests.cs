using KairosPayHub.Api.Domain.Media;
using KairosPayHub.Api.Services;

namespace KairosPayHub.Tests.Unit;

public class ServiceRecordingStatusMappingTests
{
    [Theory]
    [InlineData(0, ServiceRecordingStatus.Processing)]
    [InlineData(1, ServiceRecordingStatus.Processing)]
    [InlineData(2, ServiceRecordingStatus.Processing)]
    [InlineData(3, ServiceRecordingStatus.Ready)]
    [InlineData(4, ServiceRecordingStatus.Ready)]
    [InlineData(5, ServiceRecordingStatus.Failed)]
    public void Maps_bunny_status(int bunnyStatus, ServiceRecordingStatus expected) =>
        Assert.Equal(expected, ServiceRecordingPolicy.MapBunnyStatus(bunnyStatus));
}
