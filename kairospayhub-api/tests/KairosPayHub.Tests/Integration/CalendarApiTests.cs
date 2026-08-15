using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using KairosPayHub.Api.Domain.Structure;
using Microsoft.EntityFrameworkCore;

namespace KairosPayHub.Tests.Integration;

[Collection("postgres")]
public class CalendarApiTests(PostgresFixture fx) : IAsyncLifetime
{
    private readonly ApiFactory _factory = new(fx.ConnectionString);

    public Task InitializeAsync() => fx.ResetAsync();

    public async Task DisposeAsync() => await _factory.DisposeAsync();

    [Fact]
    public async Task Cell_scoped_event_is_visible_to_fellowship_leader()
    {
        var seed = await AttendanceApprovalSeed.CreateAsync(_factory, fx, includePfcc: false);
        var eventDate = new DateOnly(2026, 8, 20);

        var createResp = await seed.CellClient.PostAsJsonAsync("/api/calendar/events", new
        {
            title = "Cell outing",
            description = "Park meetup",
            eventDate = eventDate.ToString("yyyy-MM-dd"),
            scopeNodeId = seed.CellNodeId,
        });
        Assert.Equal(HttpStatusCode.OK, createResp.StatusCode);

        var fellowshipFeed = await seed.FellowshipClient.GetFromJsonAsync<JsonElement>(
            $"/api/calendar/feed?from={eventDate:yyyy-MM-dd}&to={eventDate:yyyy-MM-dd}");
        var fellowshipItems = fellowshipFeed.GetProperty("items").EnumerateArray().ToList();
        Assert.Contains(fellowshipItems, item =>
            item.GetProperty("kind").GetString() == "Custom"
            && item.GetProperty("title").GetString() == "Cell outing");

        var cellFeed = await seed.CellClient.GetFromJsonAsync<JsonElement>(
            $"/api/calendar/feed?from={eventDate:yyyy-MM-dd}&to={eventDate:yyyy-MM-dd}");
        var cellItems = cellFeed.GetProperty("items").EnumerateArray().ToList();
        Assert.Contains(cellItems, item => item.GetProperty("title").GetString() == "Cell outing");
    }

    [Fact]
    public async Task Creating_calendar_event_notifies_other_leaders_in_scope()
    {
        var seed = await AttendanceApprovalSeed.CreateAsync(_factory, fx, includePfcc: false);
        var eventDate = new DateOnly(2026, 8, 24);

        var createResp = await seed.CellClient.PostAsJsonAsync("/api/calendar/events", new
        {
            title = "Cell prayer night",
            description = "Bring a friend",
            eventDate = eventDate.ToString("yyyy-MM-dd"),
            scopeNodeId = seed.CellNodeId,
        });
        Assert.Equal(HttpStatusCode.OK, createResp.StatusCode);

        var fellowshipNotifications = await seed.FellowshipClient.GetFromJsonAsync<JsonElement>(
            "/api/notifications");
        Assert.True(fellowshipNotifications.GetProperty("unreadCount").GetInt32() >= 1);
        Assert.Contains(
            fellowshipNotifications.GetProperty("notifications").EnumerateArray(),
            item => item.GetProperty("kind").GetString() == "CalendarEventReminder"
                && item.GetProperty("linkPath").GetString() == "events");
    }

    [Fact]
    public async Task Fellowship_leader_can_create_event_for_their_fellowship()
    {
        var seed = await AttendanceApprovalSeed.CreateAsync(_factory, fx, includePfcc: false);
        var eventDate = new DateOnly(2026, 9, 1);

        await using var db = fx.CreateContext();
        var fellowshipNodeId = await db.StructureNodes.AsNoTracking()
            .Where(n => n.Name == "Titans")
            .Select(n => n.Id)
            .SingleAsync();

        var createResp = await seed.FellowshipClient.PostAsJsonAsync("/api/calendar/events", new
        {
            title = "Fellowship fast",
            description = (string?)null,
            eventDate = eventDate.ToString("yyyy-MM-dd"),
            scopeNodeId = fellowshipNodeId,
        });
        Assert.Equal(HttpStatusCode.OK, createResp.StatusCode);

        var feed = await seed.CellClient.GetFromJsonAsync<JsonElement>(
            $"/api/calendar/feed?from={eventDate:yyyy-MM-dd}&to={eventDate:yyyy-MM-dd}");
        var items = feed.GetProperty("items").EnumerateArray().ToList();
        Assert.Contains(items, item => item.GetProperty("title").GetString() == "Fellowship fast");
    }
}
