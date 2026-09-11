using KairosPayHub.Api.Attendance;

namespace KairosPayHub.Tests;

public class GuestRiskTests
{
    static GuestRiskInvitee Guest(string name, string phone, bool present = true) =>
        new(name, phone, present);

    [Fact]
    public void Ordinary_sheet_is_clear()
    {
        var result = GuestRisk.Score(
            presentMembers: 8,
            invitees: [Guest("Ama", "+233241111111"), Guest("Kojo", "+233242222222")],
            priorPresentPhones: new HashSet<string> { "+233241111111" });

        Assert.Equal(GuestRisk.Clear, result.Level);
        Assert.Empty(result.Reasons);
    }

    [Fact]
    public void Guest_member_imbalance_is_watch_then_flagged()
    {
        var six = Enumerable.Range(1, 6)
            .Select(i => Guest($"Guest {i}", $"+23324000000{i}"))
            .ToList();
        var watch = GuestRisk.Score(2, six, new HashSet<string>());
        Assert.Equal(GuestRisk.Watch, watch.Level);
        Assert.Contains(GuestRisk.ImbalanceReason, watch.Reasons);

        var ten = Enumerable.Range(1, 10)
            .Select(i => Guest($"Guest {i}", $"+23324100000{i}"))
            .ToList();
        var flagged = GuestRisk.Score(2, ten, new HashSet<string>());
        Assert.Equal(GuestRisk.Flagged, flagged.Level);
        Assert.Contains(GuestRisk.ImbalanceReason, flagged.Reasons);
    }

    [Fact]
    public void All_new_phones_are_watch()
    {
        var guests = Enumerable.Range(1, 5)
            .Select(i => Guest($"Guest {i}", $"+23324500000{i}"))
            .ToList();
        var result = GuestRisk.Score(8, guests, new HashSet<string>());
        Assert.Equal(GuestRisk.Watch, result.Level);
        Assert.Contains(GuestRisk.NewPhonesReason, result.Reasons);
    }

    [Fact]
    public void Same_name_many_phones_or_same_phone_many_names_is_flagged()
    {
        var manyPhones = GuestRisk.Score(
            8,
            [Guest("Ama", "+233241111111"), Guest("Ama", "+233242222222"), Guest("Ama", "+233243333333")],
            new HashSet<string>());
        Assert.Equal(GuestRisk.Flagged, manyPhones.Level);
        Assert.Contains(GuestRisk.SameNameManyPhonesReason, manyPhones.Reasons);

        var manyNames = GuestRisk.Score(
            8,
            [Guest("Ama", "+233241111111"), Guest("Efua", "+233241111111")],
            new HashSet<string>());
        Assert.Equal(GuestRisk.Flagged, manyNames.Level);
        Assert.Contains(GuestRisk.SamePhoneManyNamesReason, manyNames.Reasons);
    }
}
