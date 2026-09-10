namespace KairosPayHub.Application.Structure;

/// <summary>
/// Persistence port for wiping one church's operational data (units, members,
/// giving, attendance, events, notifications, template). Church tenant and
/// pastor/church-admin login stay. Implemented in the host, not here.
/// </summary>
public interface IChurchOperationalReset
{
    Task ResetAsync(Guid churchId, CancellationToken ct = default);
}
