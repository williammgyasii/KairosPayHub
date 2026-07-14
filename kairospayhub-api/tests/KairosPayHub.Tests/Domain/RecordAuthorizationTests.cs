using KairosPayHub.Api.Domain;

namespace KairosPayHub.Tests.Domain;

public class RecordAuthorizationTests
{
    private static readonly Guid OrgA = Guid.Parse("00000000-0000-0000-0000-00000000000a");
    private static readonly Guid OrgB = Guid.Parse("00000000-0000-0000-0000-00000000000b");
    private static readonly Guid LeaderId = Guid.Parse("00000000-0000-0000-0000-0000000000c1");

    private static Actor Pastor(Guid? org = null, Guid? id = null) =>
        new(id ?? Guid.NewGuid(), org ?? OrgA, Role.Pastor);

    private static Actor Leader(Guid? org = null, Guid? id = null) =>
        new(id ?? LeaderId, org ?? OrgA, Role.Leader);

    private static RecordForAuthz Record(
        Guid? org = null,
        Guid? submittedBy = null,
        RecordStatus status = RecordStatus.Submitted) =>
        new(Guid.NewGuid(), org ?? OrgA, submittedBy ?? LeaderId, status);

    [Fact]
    public void Leader_can_edit_own_submitted_record()
    {
        Assert.True(RecordAuthorization.CanEditRecord(Record(), Leader()));
    }

    [Fact]
    public void Leader_cannot_edit_own_record_once_verified()
    {
        Assert.False(
            RecordAuthorization.CanEditRecord(Record(status: RecordStatus.Verified), Leader()));
    }

    [Fact]
    public void Leader_cannot_edit_another_leaders_record()
    {
        Assert.False(
            RecordAuthorization.CanEditRecord(Record(submittedBy: Guid.NewGuid()), Leader()));
    }

    [Fact]
    public void Leader_cannot_edit_record_in_another_org()
    {
        Assert.False(RecordAuthorization.CanEditRecord(Record(org: OrgB), Leader()));
    }

    [Fact]
    public void Pastor_can_edit_any_record_in_org_even_verified()
    {
        var record = Record(submittedBy: Guid.NewGuid(), status: RecordStatus.Verified);
        Assert.True(RecordAuthorization.CanEditRecord(record, Pastor()));
    }

    [Fact]
    public void Pastor_cannot_edit_record_in_another_org()
    {
        Assert.False(RecordAuthorization.CanEditRecord(Record(org: OrgB), Pastor()));
    }

    [Fact]
    public void Pastor_verifies_submitted_record_and_stamps_verifier_and_time()
    {
        var pastorId = Guid.NewGuid();
        var before = DateTimeOffset.UtcNow;

        var result = RecordAuthorization.VerifyRecord(Record(), Pastor(OrgA, pastorId));

        Assert.Equal(RecordStatus.Verified, result.Status);
        Assert.Equal(pastorId, result.VerifiedById);
        Assert.True(result.VerifiedAt >= before);
    }

    [Fact]
    public void Leader_cannot_verify()
    {
        Assert.Throws<ForbiddenException>(() =>
            RecordAuthorization.VerifyRecord(Record(), Leader()));
    }

    [Fact]
    public void Cannot_verify_already_verified_record()
    {
        Assert.Throws<ForbiddenException>(() =>
            RecordAuthorization.VerifyRecord(Record(status: RecordStatus.Verified), Pastor()));
    }

    [Fact]
    public void Cannot_verify_across_orgs()
    {
        Assert.Throws<ForbiddenException>(() =>
            RecordAuthorization.VerifyRecord(Record(org: OrgB), Pastor(OrgA)));
    }
}
