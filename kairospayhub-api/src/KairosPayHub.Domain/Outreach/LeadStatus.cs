namespace KairosPayHub.Api.Domain.Outreach;

public static class LeadStatus
{
    public const string Scouted = "Scouted";
    public const string Responded = "Responded";
    public const string Converted = "Converted";
    public const string Success = "Success";
    public const string Failure = "Failure";

    public static bool IsKnown(string? status) =>
        status is Scouted or Responded or Converted or Success or Failure;
}
