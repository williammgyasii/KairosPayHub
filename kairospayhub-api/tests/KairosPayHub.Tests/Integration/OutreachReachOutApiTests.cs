using System.Net;
using System.Net.Http.Json;
using KairosPayHub.Api.Domain.Outreach;
using KairosPayHub.Api.Outreach;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace KairosPayHub.Tests.Integration;

// openspec/changes/superadmin-church-outreach/specs/outreach/church-scout/spec.md
// Requirement: A reach out sends at most once
[Collection("postgres")]
public class OutreachReachOutApiTests(PostgresFixture fx) : IAsyncLifetime
{
    private readonly ApiFactory _factory = new(fx.ConnectionString);
    private readonly CountingMailbox _mailbox = new();

    public Task InitializeAsync() => fx.ResetAsync();

    public async Task DisposeAsync() => await _factory.DisposeAsync();

    [Fact]
    public async Task Send_without_a_key_is_refused_and_nothing_goes_out()
    {
        var church = await SeedSavedChurchAsync();
        var william = Operator();

        var response = await william.PostAsJsonAsync(
            $"/api/outreach/churches/{church.Id}/messages",
            new { subject = "Hello", body = "A note." });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(0, _mailbox.Sent);
    }

    [Fact]
    public async Task Same_key_after_success_sends_once_and_reports_the_original_send()
    {
        var church = await SeedSavedChurchAsync();
        var william = Operator();
        var key = Guid.NewGuid().ToString();

        var first = await SendAsync(william, church.Id, key);
        var second = await SendAsync(william, church.Id, key);

        Assert.Equal(HttpStatusCode.OK, first.StatusCode);
        Assert.Equal(HttpStatusCode.OK, second.StatusCode);
        Assert.Equal(1, _mailbox.Sent);
        var original = await first.Content.ReadFromJsonAsync<SentBody>();
        var replay = await second.Content.ReadFromJsonAsync<SentBody>();
        Assert.Equal(original!.SentAt, replay!.SentAt);
    }

    [Fact]
    public async Task Same_key_twice_at_once_sends_exactly_one_email()
    {
        var church = await SeedSavedChurchAsync();
        _mailbox.Delay = TimeSpan.FromMilliseconds(400);
        var william = Operator();
        var key = Guid.NewGuid().ToString();

        var responses = await Task.WhenAll(SendAsync(william, church.Id, key), SendAsync(william, church.Id, key));

        Assert.Equal(1, _mailbox.Sent);
        Assert.All(responses, response =>
            Assert.Contains(response.StatusCode, new[] { HttpStatusCode.OK, HttpStatusCode.Conflict }));
    }

    [Fact]
    public async Task Mailbox_failure_leaves_the_lead_unreached_and_the_same_key_may_retry()
    {
        var church = await SeedSavedChurchAsync();
        _mailbox.FailNext = true;
        var william = Operator();
        var key = Guid.NewGuid().ToString();

        var failed = await SendAsync(william, church.Id, key);
        await using (var db = fx.CreateContext())
        {
            Assert.Null((await db.OutreachChurches.SingleAsync(row => row.Id == church.Id)).SentAt);
        }

        var retried = await SendAsync(william, church.Id, key);

        Assert.Equal(HttpStatusCode.ServiceUnavailable, failed.StatusCode);
        Assert.Equal(HttpStatusCode.OK, retried.StatusCode);
        Assert.Equal(1, _mailbox.Sent);
    }

    [Fact]
    public async Task A_follow_up_with_a_new_key_is_sent()
    {
        var church = await SeedSavedChurchAsync();
        var william = Operator();

        var first = await SendAsync(william, church.Id, Guid.NewGuid().ToString());
        var followUp = await SendAsync(william, church.Id, Guid.NewGuid().ToString(), "Following up");

        Assert.Equal(HttpStatusCode.OK, first.StatusCode);
        Assert.Equal(HttpStatusCode.OK, followUp.StatusCode);
        Assert.Equal(2, _mailbox.Sent);
        await using var db = fx.CreateContext();
        Assert.Equal("Following up", (await db.OutreachChurches.SingleAsync(row => row.Id == church.Id)).SentSubject);
    }

    private sealed record SentBody(bool Sent, DateTimeOffset? SentAt);

    private static Task<HttpResponseMessage> SendAsync(HttpClient client, Guid id, string key, string subject = "Hello")
    {
        var request = new HttpRequestMessage(HttpMethod.Post, $"/api/outreach/churches/{id}/messages")
        {
            Content = JsonContent.Create(new { subject, body = "A note." }),
        };
        request.Headers.Add("Idempotency-Key", key);
        return client.SendAsync(request);
    }

    private async Task<OutreachChurch> SeedSavedChurchAsync()
    {
        await using var db = fx.CreateContext();
        db.SuperadminOperators.Add(new SuperadminOperator { Email = "william@kairospayhub.com", PasswordHash = "unused" });
        var church = new OutreachChurch
        {
            PlaceId = "overture:madison",
            Name = "Madison Christian Church",
            Website = "https://www.madisonchristian.org/",
            Email = "info@madisonchristian.org",
            Saved = true,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
        };
        db.OutreachChurches.Add(church);
        await db.SaveChangesAsync();
        return church;
    }

    private HttpClient Operator()
    {
        var client = _factory
            .WithWebHostBuilder(builder => builder.ConfigureTestServices(services =>
            {
                services.RemoveAll<IOutreachMailbox>();
                services.AddSingleton<IOutreachMailbox>(_mailbox);
            }))
            .CreateClient();
        client.DefaultRequestHeaders.Add("X-Test-Sub", Guid.NewGuid().ToString());
        client.DefaultRequestHeaders.Add("X-Test-Email", "william@kairospayhub.com");
        client.DefaultRequestHeaders.Add("X-Test-Operator", "superadmin");
        return client;
    }

    private sealed class CountingMailbox : IOutreachMailbox
    {
        private int _sent;
        public int Sent => _sent;
        public TimeSpan Delay { get; set; } = TimeSpan.Zero;
        public bool FailNext { get; set; }

        public async Task SendAsync(string toEmail, string subject, string body, CancellationToken ct)
        {
            if (Delay > TimeSpan.Zero) await Task.Delay(Delay, ct);
            if (FailNext)
            {
                FailNext = false;
                throw new InvalidOperationException("Mailbox refused the send.");
            }
            Interlocked.Increment(ref _sent);
        }
    }
}
