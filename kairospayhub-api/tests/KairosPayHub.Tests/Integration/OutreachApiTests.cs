using System.Net;
using System.Net.Http.Json;
using KairosPayHub.Api.Domain.Outreach;
using KairosPayHub.Api.Outreach;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace KairosPayHub.Tests.Integration;

[Collection("postgres")]
public class OutreachApiTests(PostgresFixture fx) : IAsyncLifetime
{
    private readonly ApiFactory _factory = new(fx.ConnectionString);

    public Task InitializeAsync() => fx.ResetAsync();

    public async Task DisposeAsync() => await _factory.DisposeAsync();

    [Fact]
    public async Task Allowlisted_operator_may_open_outreach_and_a_pastor_may_not()
    {
        var pastor = Client(Guid.NewGuid(), "pastor@example.com");
        var stranger = _factory.CreateClient();
        var william = Client(Guid.NewGuid(), "william@kairospayhub.com");

        Assert.Equal(HttpStatusCode.Forbidden, (await pastor.GetAsync("/api/outreach/access")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await stranger.GetAsync("/api/outreach/access")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await william.GetAsync("/api/outreach/access")).StatusCode);
    }

    [Fact]
    public async Task Superadmin_table_password_signs_in_and_a_church_session_cannot()
    {
        await using var db = fx.CreateContext();
        var hasher = new PasswordHasher<SuperadminOperator>();
        var row = new SuperadminOperator { Email = "william@kairospayhub.com" };
        row.PasswordHash = hasher.HashPassword(row, "correct-horse");
        db.SuperadminOperators.Add(row);
        await db.SaveChangesAsync();

        var client = _factory.CreateClient();
        var ok = await client.PostAsJsonAsync("/api/outreach/session", new
        {
            email = "william@kairospayhub.com",
            password = "correct-horse",
        });
        var denied = await client.PostAsJsonAsync("/api/outreach/session", new
        {
            email = "william@kairospayhub.com",
            password = "wrong-password",
        });

        Assert.Equal(HttpStatusCode.OK, ok.StatusCode);
        Assert.False(string.IsNullOrWhiteSpace((await ok.Content.ReadFromJsonAsync<SessionBody>())?.AccessToken));
        Assert.Equal(HttpStatusCode.Unauthorized, denied.StatusCode);

        var churchSession = Client(Guid.NewGuid(), "william@kairospayhub.com");
        Assert.Equal(HttpStatusCode.Forbidden, (await churchSession.GetAsync("/api/outreach/access")).StatusCode);

        var operatorSession = Client(Guid.NewGuid(), "william@kairospayhub.com");
        operatorSession.DefaultRequestHeaders.Add("X-Test-Operator", "superadmin");
        Assert.Equal(HttpStatusCode.OK, (await operatorSession.GetAsync("/api/outreach/access")).StatusCode);
    }

    [Fact]
    public async Task Same_place_is_stored_once_and_a_church_without_an_email_is_absent()
    {
        await using var db = fx.CreateContext();
        var scout = new OutreachScoutService(
            db,
            new FixedGeocoder(),
            new FixedPlaces(),
            new FixedPages(),
            Options.Create(new OutreachOptions()));

        var first = await scout.SearchAsync("Columbus, OH", CancellationToken.None);
        var second = await scout.SearchAsync("Columbus, OH", CancellationToken.None);

        Assert.Single(first);
        Assert.Equal("info@madisonchristian.org", first[0].Email);
        Assert.Single(second);
        Assert.Equal(1, await db.OutreachChurches.CountAsync());
        Assert.DoesNotContain(second, row => row.Name == "Silent Chapel");
    }

    [Fact]
    public async Task Operator_lists_a_saved_church_as_scouted_and_marks_it_converted()
    {
        await using var db = fx.CreateContext();
        db.SuperadminOperators.Add(new SuperadminOperator
        {
            Email = "william@kairospayhub.com",
            PasswordHash = "unused",
        });
        var church = new OutreachChurch
        {
            PlaceId = "overture:madison",
            Name = "Madison Christian Church",
            Website = "https://www.madisonchristian.org/",
            Email = "info@madisonchristian.org",
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
        };
        db.OutreachChurches.Add(church);
        await db.SaveChangesAsync();

        var pastor = Client(Guid.NewGuid(), "pastor@example.com");
        var william = Client(Guid.NewGuid(), "william@kairospayhub.com");
        william.DefaultRequestHeaders.Add("X-Test-Operator", "superadmin");

        Assert.Equal(HttpStatusCode.Forbidden, (await pastor.GetAsync("/api/outreach/churches")).StatusCode);

        var listed = await william.GetFromJsonAsync<LeadList>("/api/outreach/churches");
        var lead = Assert.Single(listed!.Churches);
        Assert.Equal(church.Id, lead.Id);
        Assert.Equal("Scouted", lead.Status);

        var marked = await william.PatchAsJsonAsync($"/api/outreach/churches/{church.Id}", new { status = "Converted" });
        Assert.Equal(HttpStatusCode.OK, marked.StatusCode);

        var again = await william.GetFromJsonAsync<LeadList>("/api/outreach/churches");
        Assert.Equal("Converted", Assert.Single(again!.Churches).Status);
        Assert.Equal(HttpStatusCode.Forbidden, (await pastor.PatchAsJsonAsync(
            $"/api/outreach/churches/{church.Id}",
            new { status = "Converted" })).StatusCode);
    }

    private sealed record SessionBody(string? AccessToken);
    private sealed record LeadList(IReadOnlyList<LeadBody> Churches);
    private sealed record LeadBody(Guid Id, string Name, string Status);

    private HttpClient Client(Guid sub, string email)
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Test-Sub", sub.ToString());
        client.DefaultRequestHeaders.Add("X-Test-Email", email);
        return client;
    }

    private sealed class FixedGeocoder : IAreaGeocoder
    {
        public Task<GeoPoint?> LocateAsync(string area, CancellationToken ct) =>
            Task.FromResult<GeoPoint?>(new GeoPoint(39.96, -82.99));
    }

    private sealed class FixedPlaces : IChurchPlaceSearch
    {
        public Task<IReadOnlyList<ChurchPlace>> SearchAsync(double lat, double lon, double radiusMiles, CancellationToken ct) =>
            Task.FromResult<IReadOnlyList<ChurchPlace>>(
            [
                new("overture:madison", "Madison Christian Church", "3565 Bixby Rd", "https://www.madisonchristian.org/"),
                new("overture:silent", "Silent Chapel", "1 Quiet Ln", "https://silent.example"),
                new("overture:noweb", "No Website Chapel", "2 Main", null),
            ]);
    }

    private sealed class FixedPages : IChurchPageFetcher
    {
        public Task<ChurchPages> FetchAsync(string website, CancellationToken ct)
        {
            if (website.Contains("madisonchristian", StringComparison.Ordinal))
            {
                return Task.FromResult(new ChurchPages(
                    "<p>Email: inf&#111;&#064;madisonchristian.org</p>",
                    "<p>Welcome</p>",
                    "https://www.madisonchristian.org/contact/"));
            }

            return Task.FromResult(new ChurchPages("<p>Call us</p>", "<p>Welcome</p>", website + "/contact"));
        }
    }
}
