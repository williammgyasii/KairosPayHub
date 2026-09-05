using System.Security.Claims;
using KairosPayHub.Api.Web;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace KairosPayHub.Api.Hubs;

public interface INotificationClient
{
    Task NotificationReceived(NotificationDto notification);
}

[Authorize]
public class NotificationHub : Hub<INotificationClient>
{
    public static string UserGroup(Guid authUserId) => $"user:{authUserId}";

    public override async Task OnConnectedAsync()
    {
        var sub = Context.User?.FindFirst("sub")?.Value
            ?? Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (Guid.TryParse(sub, out var authUserId))
            await Groups.AddToGroupAsync(Context.ConnectionId, UserGroup(authUserId));

        await base.OnConnectedAsync();
    }
}
