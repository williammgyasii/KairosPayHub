using KairosPayHub.Api.Domain;
using KairosPayHub.Api.Domain.Structure;
using KairosPayHub.Application.Structure;

namespace KairosPayHub.Tests.Application;

public class DeleteStructureTemplateTests
{
    [Fact]
    public async Task Cell_leader_cannot_wipe_structure()
    {
        var reset = new FakeReset();
        var handler = new DeleteStructureTemplate(reset);
        var churchId = Guid.NewGuid();
        var actor = new Actor(
            Guid.NewGuid(),
            Guid.NewGuid(),
            Role.Leader,
            churchId,
            churchId,
            ChurchRole.CellLeader);

        await Assert.ThrowsAsync<ForbiddenException>(() => handler.ExecuteAsync(actor));
        Assert.Null(reset.LastChurchId);
    }

    [Fact]
    public async Task Pastor_without_a_church_is_not_onboarded()
    {
        var reset = new FakeReset();
        var handler = new DeleteStructureTemplate(reset);
        var actor = new Actor(Guid.NewGuid(), Guid.NewGuid(), Role.Pastor);

        await Assert.ThrowsAsync<NotOnboardedException>(() => handler.ExecuteAsync(actor));
        Assert.Null(reset.LastChurchId);
    }

    [Fact]
    public async Task Pastor_resets_their_church()
    {
        var reset = new FakeReset();
        var handler = new DeleteStructureTemplate(reset);
        var churchId = Guid.NewGuid();
        var actor = new Actor(
            Guid.NewGuid(),
            Guid.NewGuid(),
            Role.Pastor,
            churchId,
            churchId,
            ChurchRole.Pastor);

        await handler.ExecuteAsync(actor);

        Assert.Equal(churchId, reset.LastChurchId);
    }

    [Fact]
    public async Task Church_admin_resets_their_church()
    {
        var reset = new FakeReset();
        var handler = new DeleteStructureTemplate(reset);
        var churchId = Guid.NewGuid();
        var actor = new Actor(
            Guid.NewGuid(),
            Guid.NewGuid(),
            Role.Leader,
            churchId,
            churchId,
            ChurchRole.ChurchAdmin);

        await handler.ExecuteAsync(actor);

        Assert.Equal(churchId, reset.LastChurchId);
    }

    private sealed class FakeReset : IChurchOperationalReset
    {
        public Guid? LastChurchId { get; private set; }

        public Task ResetAsync(Guid churchId, CancellationToken ct = default)
        {
            LastChurchId = churchId;
            return Task.CompletedTask;
        }
    }
}
