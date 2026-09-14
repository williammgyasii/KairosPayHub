using KairosPayHub.Api.FeatureFlags;

namespace KairosPayHub.Tests.Unit;

public class ServiceRecordingFeaturePolicyTests
{
    private static readonly Guid PilotChurch = Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");

    [Fact]
    public void Enabled_true_allows_any_church()
    {
        var options = new ServiceRecordingsFeatureOptions { Enabled = true };
        Assert.True(ServiceRecordingFeaturePolicy.IsEnabled(options, PilotChurch));
        Assert.True(ServiceRecordingFeaturePolicy.IsEnabled(options, Guid.NewGuid()));
        Assert.True(ServiceRecordingFeaturePolicy.IsEnabled(options, null));
    }

    [Fact]
    public void Enabled_false_blocks_when_not_allowlisted()
    {
        var options = new ServiceRecordingsFeatureOptions { Enabled = false };
        Assert.False(ServiceRecordingFeaturePolicy.IsEnabled(options, Guid.NewGuid()));
        Assert.False(ServiceRecordingFeaturePolicy.IsEnabled(options, null));
    }

    [Fact]
    public void Allowlist_permits_pilot_church_when_platform_off()
    {
        var options = new ServiceRecordingsFeatureOptions
        {
            Enabled = false,
            AllowedChurchIds = $"{PilotChurch}, bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
        };
        Assert.True(ServiceRecordingFeaturePolicy.IsEnabled(options, PilotChurch));
        Assert.False(ServiceRecordingFeaturePolicy.IsEnabled(options, Guid.NewGuid()));
    }

    [Fact]
    public void ParseAllowlist_ignores_invalid_guids()
    {
        var ids = ServiceRecordingFeaturePolicy.ParseAllowlist("not-a-guid, ,");
        Assert.Empty(ids);
    }
}
