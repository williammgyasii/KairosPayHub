namespace KairosPayHub.Api.Attendance;

public sealed record GuestRiskInvitee(string Name, string? Phone, bool Present);

public sealed record GuestRiskResult(string Level, IReadOnlyList<string> Reasons);

public static class GuestRisk
{
    public const string Clear = "clear";
    public const string Watch = "watch";
    public const string Flagged = "flagged";

    public const string ImbalanceReason = "Guests far outnumber members present";
    public const string NewPhonesReason = "Most guest phones are new for this unit";
    public const string SameNameManyPhonesReason = "Same guest name used with many phones";
    public const string SamePhoneManyNamesReason = "Same phone used with different guest names";

    public static GuestRiskResult Score(
        int presentMembers,
        IReadOnlyList<GuestRiskInvitee> invitees,
        IReadOnlySet<string> priorPresentPhones)
    {
        var present = invitees.Where(row => row.Present).ToList();
        var level = Clear;
        var reasons = new List<string>();

        var guestCount = present.Count;
        var ratio = guestCount / (double)Math.Max(presentMembers, 1);
        if (guestCount >= 10 && ratio >= 5)
            Raise(ref level, reasons, Flagged, ImbalanceReason);
        else if (guestCount >= 6 && ratio >= 3)
            Raise(ref level, reasons, Watch, ImbalanceReason);

        var phones = present
            .Select(row => NormalizePhone(row.Phone))
            .Where(phone => phone.Length > 0)
            .ToList();
        if (phones.Count >= 5 && phones.All(phone => !priorPresentPhones.Contains(phone)))
            Raise(ref level, reasons, Watch, NewPhonesReason);

        var namePhoneCounts = present
            .GroupBy(row => NormalizeName(row.Name))
            .Select(group => group
                .Select(row => NormalizePhone(row.Phone))
                .Where(phone => phone.Length > 0)
                .Distinct()
                .Count());
        if (namePhoneCounts.Any(count => count >= 3))
            Raise(ref level, reasons, Flagged, SameNameManyPhonesReason);

        var phoneNameCounts = present
            .Where(row => NormalizePhone(row.Phone).Length > 0)
            .GroupBy(row => NormalizePhone(row.Phone))
            .Select(group => group.Select(row => NormalizeName(row.Name)).Distinct().Count());
        if (phoneNameCounts.Any(count => count >= 2))
            Raise(ref level, reasons, Flagged, SamePhoneManyNamesReason);

        return new GuestRiskResult(level, reasons);
    }

    public static string NormalizePhone(string? phone)
    {
        if (string.IsNullOrWhiteSpace(phone)) return string.Empty;
        return new string(phone.Where(ch => char.IsDigit(ch) || ch == '+').ToArray());
    }

    public static string NormalizeName(string? name) =>
        string.Join(' ', (name ?? string.Empty).Trim().ToLowerInvariant().Split(' ', StringSplitOptions.RemoveEmptyEntries));

    static void Raise(ref string level, List<string> reasons, string next, string reason)
    {
        if (Rank(next) > Rank(level))
            level = next;
        if (!reasons.Contains(reason))
            reasons.Add(reason);
    }

    static int Rank(string level) => level switch
    {
        Flagged => 2,
        Watch => 1,
        _ => 0,
    };
}
