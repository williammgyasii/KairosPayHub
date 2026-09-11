using KairosPayHub.Api.Domain.Structure;

namespace KairosPayHub.Api.Authorization;

public sealed record AbilityRuleDto(string Action, string Subject);

public sealed record AbilityResolution(
    IReadOnlyList<string> Abilities,
    IReadOnlyList<AbilityRuleDto> Rules,
    LeadershipProfileKind Profile);

/// <summary>Resolves product abilities from role + optional structure layer kind.</summary>
public class AbilityResolver
{
    public AbilityResolution Resolve(
        ChurchRole? role,
        StructureLayerType? layerKind = null,
        IReadOnlyCollection<string>? disabledAbilities = null)
    {
        if (role is null)
            return Empty();

        var profile = LayerLeadershipProfiles.ProfileFor(role.Value, layerKind);
        var abilities = LayerLeadershipProfiles.FinalizeForRole(
            role.Value,
            LayerLeadershipProfiles.AbilitiesFor(profile));
        if (role.Value != ChurchRole.Pastor && disabledAbilities is { Count: > 0 })
        {
            abilities = abilities
                .Where(a => !disabledAbilities.Contains(a, StringComparer.Ordinal))
                .ToList();
        }

        var rules = PackRules(abilities);
        return new AbilityResolution(abilities, rules, profile);
    }

    public static IReadOnlyList<AbilityRuleDto> PackRules(IEnumerable<string> abilities)
    {
        var rules = new List<AbilityRuleDto>();
        foreach (var ability in abilities.Distinct(StringComparer.Ordinal))
        {
            rules.AddRange(ability switch
            {
                ProductAbilities.ManageChurch => [new("manage", "Church")],
                ProductAbilities.ManageStructure => [new("manage", "Structure")],
                ProductAbilities.ViewMemberGivings => [new("view", "MemberGivings")],
                ProductAbilities.ApproveGiving => [new("approve", "Giving")],
                ProductAbilities.LogGiving => [new("log", "Giving")],
                ProductAbilities.CreateCampaign => [new("create", "Campaign")],
                ProductAbilities.CreateSubCampaign => [new("create", "SubCampaign")],
                ProductAbilities.ViewOverallGivings => [new("view", "OverallGivings")],
                ProductAbilities.ManageRoster => [new("manage", "Roster")],
                ProductAbilities.CreateChildUnits => [new("create", "ChildUnit")],
                _ => Array.Empty<AbilityRuleDto>(),
            });
        }

        return rules;
    }

    static AbilityResolution Empty() =>
        new([], [], LeadershipProfileKind.Member);
}
