using KairosPayHub.Api.Domain.Structure;

namespace KairosPayHub.Api.Authorization;

/// <summary>Default leadership profiles by layer kind (labels never appear here).</summary>
public enum LeadershipProfileKind
{
    ChurchWide,
    Intermediate,
    Leaf,
    Member,
}

public static class LayerLeadershipProfiles
{
    public static LeadershipProfileKind ProfileFor(ChurchRole role, StructureLayerType? layerKind)
    {
        if (role is ChurchRole.Pastor or ChurchRole.ChurchAdmin)
            return LeadershipProfileKind.ChurchWide;

        if (layerKind is StructureLayerType.Cell)
            return LeadershipProfileKind.Leaf;

        if (layerKind is StructureLayerType.Fellowship or StructureLayerType.PFCC or StructureLayerType.Group)
            return LeadershipProfileKind.Intermediate;

        return role switch
        {
            ChurchRole.PFCCManager or ChurchRole.FellowshipLeader => LeadershipProfileKind.Intermediate,
            ChurchRole.CellLeader => LeadershipProfileKind.Leaf,
            _ => LeadershipProfileKind.Member,
        };
    }

    public static IReadOnlyList<string> AbilitiesFor(LeadershipProfileKind profile) =>
        profile switch
        {
            LeadershipProfileKind.ChurchWide =>
            [
                ProductAbilities.ManageChurch,
                ProductAbilities.ManageStructure,
                ProductAbilities.ViewMemberGivings,
                ProductAbilities.ApproveGiving,
                ProductAbilities.LogGiving,
                ProductAbilities.CreateCampaign,
                ProductAbilities.CreateSubCampaign,
                ProductAbilities.ViewOverallGivings,
                ProductAbilities.ManageRoster,
                ProductAbilities.CreateChildUnits,
            ],
            LeadershipProfileKind.Intermediate =>
            [
                ProductAbilities.ViewMemberGivings,
                ProductAbilities.ApproveGiving,
                ProductAbilities.LogGiving,
                ProductAbilities.CreateCampaign,
                ProductAbilities.CreateSubCampaign,
                ProductAbilities.ViewOverallGivings,
                ProductAbilities.ManageRoster,
                ProductAbilities.CreateChildUnits,
            ],
            LeadershipProfileKind.Leaf =>
            [
                ProductAbilities.ViewMemberGivings,
                ProductAbilities.LogGiving,
                ProductAbilities.ViewOverallGivings,
                ProductAbilities.ManageRoster,
            ],
            _ => [],
        };

    /// <summary>
    /// PFCC managers keep create-campaign even when profile is intermediate via role;
    /// Fellowship leaders do not get createCampaign in today's product — trim after profile.
    /// </summary>
    public static IReadOnlyList<string> FinalizeForRole(ChurchRole role, IEnumerable<string> profileAbilities)
    {
        var set = new HashSet<string>(profileAbilities, StringComparer.Ordinal);
        if (role == ChurchRole.FellowshipLeader)
        {
            set.Remove(ProductAbilities.CreateCampaign);
            set.Remove(ProductAbilities.CreateSubCampaign);
        }

        if (role == ChurchRole.PFCCManager)
        {
            set.Add(ProductAbilities.CreateCampaign);
            set.Add(ProductAbilities.CreateSubCampaign);
        }

        return set.OrderBy(a => a, StringComparer.Ordinal).ToList();
    }
}
