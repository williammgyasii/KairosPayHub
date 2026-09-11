namespace KairosPayHub.Api.Domain.Authorization;

public enum AbilityOverlaySubjectKind
{
    Layer,
    AdminProfile,
    AdminUser,
}

public class ChurchAbilityOverlay
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ChurchId { get; set; }
    public AbilityOverlaySubjectKind SubjectKind { get; set; }
    public Guid? SubjectId { get; set; }
    public string Ability { get; set; } = string.Empty;
    public bool Enabled { get; set; }
}
