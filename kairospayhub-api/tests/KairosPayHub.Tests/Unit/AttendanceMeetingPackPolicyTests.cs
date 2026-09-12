using KairosPayHub.Api.Services;

namespace KairosPayHub.Tests.Unit;

public class AttendanceMeetingPackPolicyTests
{
    [Fact]
    public void Complete_with_note_or_file()
    {
        Assert.True(AttendanceMeetingPackPolicy.IsComplete("Romans 8", 0));
        Assert.True(AttendanceMeetingPackPolicy.IsComplete("", 1));
        Assert.False(AttendanceMeetingPackPolicy.IsComplete("  ", 0));
        Assert.False(AttendanceMeetingPackPolicy.IsComplete(null, 0));
    }

    [Fact]
    public void Allows_pdf_and_images_only()
    {
        Assert.True(AttendanceMeetingPackPolicy.FileAllowed("application/pdf"));
        Assert.True(AttendanceMeetingPackPolicy.FileAllowed("image/png"));
        Assert.False(AttendanceMeetingPackPolicy.FileAllowed("video/mp4"));
    }

    [Fact]
    public void Fingerprint_is_stable_for_the_same_note_and_files()
    {
        var a = Guid.Parse("11111111-1111-1111-1111-111111111111");
        var b = Guid.Parse("22222222-2222-2222-2222-222222222222");
        Assert.Equal(
            AttendanceMeetingPackPolicy.Fingerprint(" Notes ", [b, a]),
            AttendanceMeetingPackPolicy.Fingerprint("Notes", [a, b]));
    }
}
