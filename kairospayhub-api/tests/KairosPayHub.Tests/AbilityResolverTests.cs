using KairosPayHub.Api.Authorization;
using KairosPayHub.Api.Domain.Structure;

namespace KairosPayHub.Tests;

public class AbilityResolverTests
{
    readonly AbilityResolver _resolver = new();

    [Fact]
    public void Pastor_gets_church_wide_abilities()
    {
        var result = _resolver.Resolve(ChurchRole.Pastor);
        Assert.Equal(LeadershipProfileKind.ChurchWide, result.Profile);
        Assert.Contains(ProductAbilities.ManageChurch, result.Abilities);
        Assert.Contains(ProductAbilities.ViewMemberGivings, result.Abilities);
        Assert.Contains(ProductAbilities.CreateChildUnits, result.Abilities);
        Assert.Contains(result.Rules, r => r.Action == "view" && r.Subject == "MemberGivings");
    }

    [Fact]
    public void FellowshipLeader_gets_intermediate_without_create_campaign()
    {
        var result = _resolver.Resolve(ChurchRole.FellowshipLeader, StructureLayerType.Fellowship);
        Assert.Equal(LeadershipProfileKind.Intermediate, result.Profile);
        Assert.Contains(ProductAbilities.ViewMemberGivings, result.Abilities);
        Assert.Contains(ProductAbilities.ApproveGiving, result.Abilities);
        Assert.Contains(ProductAbilities.CreateChildUnits, result.Abilities);
        Assert.DoesNotContain(ProductAbilities.CreateCampaign, result.Abilities);
        Assert.DoesNotContain(ProductAbilities.ManageChurch, result.Abilities);
    }

    [Fact]
    public void CellLeader_gets_leaf_member_givings_even_when_layer_label_would_differ()
    {
        // StandardType.Cell drives leaf profile; DisplayName is irrelevant to Resolve.
        var result = _resolver.Resolve(ChurchRole.CellLeader, StructureLayerType.Cell);
        Assert.Equal(LeadershipProfileKind.Leaf, result.Profile);
        Assert.Contains(ProductAbilities.ViewMemberGivings, result.Abilities);
        Assert.Contains(ProductAbilities.LogGiving, result.Abilities);
        Assert.DoesNotContain(ProductAbilities.ApproveGiving, result.Abilities);
        Assert.DoesNotContain(ProductAbilities.ManageChurch, result.Abilities);
        Assert.DoesNotContain(ProductAbilities.CreateChildUnits, result.Abilities);
    }

    [Fact]
    public void Member_gets_no_manage_abilities()
    {
        var result = _resolver.Resolve(ChurchRole.Member);
        Assert.Equal(LeadershipProfileKind.Member, result.Profile);
        Assert.Empty(result.Abilities);
        Assert.Empty(result.Rules);
    }

    [Fact]
    public void Overlay_turns_ability_off_for_non_pastor()
    {
        var result = _resolver.Resolve(
            ChurchRole.FellowshipLeader,
            StructureLayerType.Fellowship,
            [ProductAbilities.CreateChildUnits]);

        Assert.DoesNotContain(ProductAbilities.CreateChildUnits, result.Abilities);
        Assert.Contains(ProductAbilities.ManageRoster, result.Abilities);
    }

    [Fact]
    public void Pastor_ignores_disabled_overlays()
    {
        var result = _resolver.Resolve(
            ChurchRole.Pastor,
            null,
            [ProductAbilities.CreateChildUnits, ProductAbilities.ViewOverallGivings]);

        Assert.Contains(ProductAbilities.CreateChildUnits, result.Abilities);
        Assert.Contains(ProductAbilities.ViewOverallGivings, result.Abilities);
    }

    [Fact]
    public void Admin_profile_overlay_strips_ability()
    {
        var result = _resolver.Resolve(
            ChurchRole.ChurchAdmin,
            null,
            [ProductAbilities.ViewOverallGivings]);

        Assert.DoesNotContain(ProductAbilities.ViewOverallGivings, result.Abilities);
        Assert.Contains(ProductAbilities.ManageChurch, result.Abilities);
    }

    [Fact]
    public void Renamed_leaf_kind_Cell_still_yields_leaf_profile()
    {
        var result = _resolver.Resolve(ChurchRole.CellLeader, StructureLayerType.Cell);
        Assert.Equal(LeadershipProfileKind.Leaf, result.Profile);
        Assert.Contains(ProductAbilities.ViewMemberGivings, result.Abilities);
    }
}
