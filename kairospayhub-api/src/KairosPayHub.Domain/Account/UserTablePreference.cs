namespace KairosPayHub.Api.Domain.Account;

public class UserTablePreference
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid AuthUserId { get; set; }
    public string Key { get; set; } = string.Empty;
    public string ColumnsJson { get; set; } = "{}";
}
