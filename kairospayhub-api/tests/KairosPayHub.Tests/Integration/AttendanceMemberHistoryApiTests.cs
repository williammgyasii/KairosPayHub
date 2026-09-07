using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using KairosPayHub.Api.Domain.Attendance;
using Microsoft.EntityFrameworkCore;

namespace KairosPayHub.Tests.Integration;

[Collection("postgres")]
public class AttendanceMemberHistoryApiTests(PostgresFixture fx) : IAsyncLifetime
{
    private readonly ApiFactory _factory = new(fx.ConnectionString);

    public Task InitializeAsync() => fx.ResetAsync();

    public async Task DisposeAsync() => await _factory.DisposeAsync();

    [Fact]
    public async Task Member_history_lists_present_and_absent_with_summary()
    {
        var seed = await AttendanceTestSeed.CreateAsync(_factory, fx);

        await using (var db = fx.CreateContext())
        {
            var occurrence = await db.AttendanceOccurrences.SingleAsync(o => o.Id == seed.OccurrenceId);
            occurrence.SubmissionOpensAt = DateTimeOffset.UtcNow.AddHours(-1);
            occurrence.Status = AttendanceOccurrenceStatus.Open;

            var submission = await db.AttendanceScopeSubmissions
                .SingleAsync(s => s.OccurrenceId == seed.OccurrenceId && s.ScopeNodeId == seed.CellNodeId);
            submission.LockStatus = AttendanceScopeLockStatus.Editable;
            await db.SaveChangesAsync();
        }

        var putResp = await seed.CellClient.PutAsJsonAsync(
            $"/api/attendance/occurrences/{seed.OccurrenceId}/scopes/{seed.CellNodeId}/entries",
            new
            {
                entries = new[] { new { memberId = seed.MemberId, status = "Present" } },
            });
        Assert.Equal(HttpStatusCode.OK, putResp.StatusCode);

        // Second occurrence: mark absent via direct DB for a second history row
        Guid secondOccurrenceId;
        await using (var db = fx.CreateContext())
        {
            var first = await db.AttendanceOccurrences
                .Include(o => o.MeetingType)
                .SingleAsync(o => o.Id == seed.OccurrenceId);
            var second = new AttendanceOccurrence
            {
                ChurchId = first.ChurchId,
                MeetingTypeId = first.MeetingTypeId,
                MeetingDate = first.MeetingDate.AddDays(7),
                SubmissionOpensAt = DateTimeOffset.UtcNow.AddHours(-2),
                SubmissionDeadlineAt = DateTimeOffset.UtcNow.AddHours(2),
                Status = AttendanceOccurrenceStatus.Open,
                CreatedAt = DateTimeOffset.UtcNow,
            };
            db.AttendanceOccurrences.Add(second);
            db.AttendanceEntries.Add(new AttendanceEntry
            {
                OccurrenceId = second.Id,
                MemberId = seed.MemberId,
                MemberScopeNodeId = seed.CellNodeId,
                Status = AttendanceEntryStatus.Absent,
                MarkedAt = DateTimeOffset.UtcNow,
            });
            await db.SaveChangesAsync();
            secondOccurrenceId = second.Id;
        }

        var history = await seed.PastorClient.GetFromJsonAsync<JsonElement>(
            $"/api/attendance/members/{seed.MemberId}/history?page=1&pageSize=10");

        Assert.Equal(2, history.GetProperty("totalCount").GetInt32());
        Assert.Equal(1, history.GetProperty("summary").GetProperty("presentCount").GetInt32());
        Assert.Equal(1, history.GetProperty("summary").GetProperty("absentCount").GetInt32());
        Assert.Equal(2, history.GetProperty("summary").GetProperty("recordedCount").GetInt32());
        Assert.Equal(2, history.GetProperty("items").GetArrayLength());

        var statuses = history.GetProperty("items").EnumerateArray()
            .Select(i => i.GetProperty("status").GetString())
            .OrderBy(s => s)
            .ToList();
        Assert.Equal(["Absent", "Present"], statuses);

        var meetingTypes = history.GetProperty("meetingTypes").EnumerateArray().ToList();
        Assert.Contains(meetingTypes, t => t.GetProperty("title").GetString() == "Sunday Service"
            && t.GetProperty("recordedCount").GetInt32() == 2);

        _ = secondOccurrenceId;
    }

    [Fact]
    public async Task Member_history_filters_by_meeting_type_and_lists_zero_types()
    {
        var seed = await AttendanceTestSeed.CreateAsync(_factory, fx);

        await using (var db = fx.CreateContext())
        {
            var occurrence = await db.AttendanceOccurrences.SingleAsync(o => o.Id == seed.OccurrenceId);
            occurrence.SubmissionOpensAt = DateTimeOffset.UtcNow.AddHours(-1);
            occurrence.Status = AttendanceOccurrenceStatus.Open;
            var submission = await db.AttendanceScopeSubmissions
                .SingleAsync(s => s.OccurrenceId == seed.OccurrenceId && s.ScopeNodeId == seed.CellNodeId);
            submission.LockStatus = AttendanceScopeLockStatus.Editable;
            await db.SaveChangesAsync();
        }

        var putResp = await seed.CellClient.PutAsJsonAsync(
            $"/api/attendance/occurrences/{seed.OccurrenceId}/scopes/{seed.CellNodeId}/entries",
            new
            {
                entries = new[] { new { memberId = seed.MemberId, status = "Present" } },
            });
        Assert.Equal(HttpStatusCode.OK, putResp.StatusCode);

        Guid midweekTypeId;
        await using (var db = fx.CreateContext())
        {
            var sunday = await db.AttendanceMeetingTypes.SingleAsync(t => t.Id == seed.MeetingTypeId);
            var midweek = new AttendanceMeetingType
            {
                ChurchId = sunday.ChurchId,
                Title = "Midweek Service",
                RecurrenceKind = AttendanceRecurrenceKind.Weekly,
                DayOfWeek = DayOfWeek.Wednesday,
                ScopeKind = sunday.ScopeKind,
                OpensDayOffset = 0,
                OpensTimeUtc = TimeOnly.Parse("21:00:00"),
                DeadlineDayOffset = 1,
                DeadlineTimeUtc = TimeOnly.Parse("12:00:00"),
                AutoGenerateWeeksAhead = 8,
                IsAlwaysOpen = true,
                IsActive = true,
                CreatedByAuthUserId = sunday.CreatedByAuthUserId,
                CreatedAt = DateTimeOffset.UtcNow,
                SubmissionLayerId = sunday.SubmissionLayerId,
            };
            db.AttendanceMeetingTypes.Add(midweek);

            var midweekOccurrence = new AttendanceOccurrence
            {
                ChurchId = sunday.ChurchId,
                MeetingTypeId = midweek.Id,
                MeetingDate = DateOnly.FromDateTime(DateTime.UtcNow.Date),
                SubmissionOpensAt = DateTimeOffset.UtcNow.AddHours(-2),
                SubmissionDeadlineAt = DateTimeOffset.UtcNow.AddHours(2),
                Status = AttendanceOccurrenceStatus.Open,
                CreatedAt = DateTimeOffset.UtcNow,
            };
            db.AttendanceOccurrences.Add(midweekOccurrence);
            db.AttendanceEntries.Add(new AttendanceEntry
            {
                OccurrenceId = midweekOccurrence.Id,
                MemberId = seed.MemberId,
                MemberScopeNodeId = seed.CellNodeId,
                Status = AttendanceEntryStatus.Absent,
                MarkedAt = DateTimeOffset.UtcNow,
            });
            await db.SaveChangesAsync();
            midweekTypeId = midweek.Id;
        }

        var filtered = await seed.PastorClient.GetFromJsonAsync<JsonElement>(
            $"/api/attendance/members/{seed.MemberId}/history?meetingTypeId={midweekTypeId}&page=1&pageSize=10");

        Assert.Equal(midweekTypeId, filtered.GetProperty("meetingTypeId").GetGuid());
        Assert.Equal(1, filtered.GetProperty("totalCount").GetInt32());
        Assert.Equal(0, filtered.GetProperty("summary").GetProperty("presentCount").GetInt32());
        Assert.Equal(1, filtered.GetProperty("summary").GetProperty("absentCount").GetInt32());
        Assert.Equal(1, filtered.GetProperty("items").GetArrayLength());
        Assert.Equal("Absent", filtered.GetProperty("items")[0].GetProperty("status").GetString());
        Assert.Equal(midweekTypeId, filtered.GetProperty("items")[0].GetProperty("meetingTypeId").GetGuid());

        var types = filtered.GetProperty("meetingTypes").EnumerateArray().ToList();
        Assert.Contains(types, t => t.GetProperty("title").GetString() == "Sunday Service"
            && t.GetProperty("presentCount").GetInt32() == 1
            && t.GetProperty("recordedCount").GetInt32() == 1);
        Assert.Contains(types, t => t.GetProperty("meetingTypeId").GetGuid() == midweekTypeId
            && t.GetProperty("absentCount").GetInt32() == 1
            && t.GetProperty("recordedCount").GetInt32() == 1);
    }

    [Fact]
    public async Task Member_history_returns_forbidden_for_unknown_member()
    {
        var seed = await AttendanceTestSeed.CreateAsync(_factory, fx);
        var resp = await seed.PastorClient.GetAsync(
            $"/api/attendance/members/{Guid.NewGuid()}/history");
        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }
}
