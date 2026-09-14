using KairosPayHub.Api.Domain.Media;
using KairosPayHub.Api.Services;

namespace KairosPayHub.Tests.Unit;

public class ServiceRecordingThumbnailPolicyTests
{
    [Fact]
    public void DisplayUrl_prefers_custom_thumbnail()
    {
        var recording = new ChurchServiceRecording
        {
            ThumbnailUrl = "https://bunny.test/auto.jpg",
            CustomThumbnailUrl = "https://r2.test/custom.jpg",
        };

        Assert.Equal("https://r2.test/custom.jpg", ServiceRecordingThumbnailPolicy.DisplayUrl(recording));
    }

    [Fact]
    public void DisplayUrl_falls_back_to_bunny_thumbnail()
    {
        var recording = new ChurchServiceRecording
        {
            ThumbnailUrl = "https://bunny.test/auto.jpg",
        };

        Assert.Equal("https://bunny.test/auto.jpg", ServiceRecordingThumbnailPolicy.DisplayUrl(recording));
    }
}
