using KairosPayHub.Api.Hubs;
using KairosPayHub.Api.Web;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using System.Security.Claims;

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
        if (Guid.TryParse(Context.User?.FindFirst("sub")?.Value, out var authUserId))
            await Groups.AddToGroupAsync(Context.ConnectionId, UserGroup(authUserId));

        await base.OnConnectedAsync();
    }
}
