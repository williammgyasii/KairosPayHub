namespace KairosPayHub.Api.Domain.Structure;

/// <summary>Church-facing role label for a person on the roster (not login access).</summary>
public enum MemberPosition
{
    Member = 0,
    CellLeader = 1,
    FellowshipLeader = 2,
    PfccManager = 3,
}
