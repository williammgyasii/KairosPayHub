namespace KairosPayHub.Api.Authorization;

/// <summary>Stable product ability identifiers (not church layer labels).</summary>
public static class ProductAbilities
{
    public const string ManageChurch = "manageChurch";
    public const string ManageStructure = "manageStructure";
    public const string ViewMemberGivings = "viewMemberGivings";
    public const string ApproveGiving = "approveGiving";
    public const string LogGiving = "logGiving";
    public const string CreateCampaign = "createCampaign";
    public const string CreateSubCampaign = "createSubCampaign";
    public const string ViewOverallGivings = "viewOverallGivings";
    public const string ManageRoster = "manageRoster";

    public static IReadOnlyList<string> All { get; } =
    [
        ManageChurch,
        ManageStructure,
        ViewMemberGivings,
        ApproveGiving,
        LogGiving,
        CreateCampaign,
        CreateSubCampaign,
        ViewOverallGivings,
        ManageRoster,
    ];
}
