using KairosPayHub.Api.Auth;
using KairosPayHub.Api.Domain;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace KairosPayHub.Api.Data;

public class KairosDbContext(DbContextOptions<KairosDbContext> options)
    : IdentityDbContext<ApplicationUser, IdentityRole<Guid>, Guid>(options)
{
    public DbSet<Organization> Organizations => Set<Organization>();
    public DbSet<Church> Churches => Set<Church>();
    public DbSet<User> AppUsers => Set<User>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<OneTimeToken> OneTimeTokens => Set<OneTimeToken>();
    public DbSet<EmailConfirmationCode> EmailConfirmationCodes => Set<EmailConfirmationCode>();

    public DbSet<Domain.Structure.Church> StructureChurches => Set<Domain.Structure.Church>();
    public DbSet<Domain.Structure.Pfcc> Pfccs => Set<Domain.Structure.Pfcc>();
    public DbSet<Domain.Structure.Fellowship> StructureFellowships => Set<Domain.Structure.Fellowship>();
    public DbSet<Domain.Structure.Cell> StructureCells => Set<Domain.Structure.Cell>();
    public DbSet<Domain.Structure.Member> ChurchMembers => Set<Domain.Structure.Member>();
    public DbSet<Domain.Structure.UnitJoinInvite> UnitJoinInvites => Set<Domain.Structure.UnitJoinInvite>();
    public DbSet<Domain.Structure.RoleAssignment> RoleAssignments => Set<Domain.Structure.RoleAssignment>();
    public DbSet<Domain.Structure.StructureTemplate> StructureTemplates => Set<Domain.Structure.StructureTemplate>();
    public DbSet<Domain.Structure.StructureLayer> StructureLayers => Set<Domain.Structure.StructureLayer>();
    public DbSet<Domain.Structure.StructureNode> StructureNodes => Set<Domain.Structure.StructureNode>();
    public DbSet<Domain.Giving.GivingProgram> GivingPrograms => Set<Domain.Giving.GivingProgram>();
    public DbSet<Domain.Giving.GivingProgramScopeNode> GivingProgramScopeNodes =>
        Set<Domain.Giving.GivingProgramScopeNode>();
    public DbSet<Domain.Giving.Contribution> Contributions => Set<Domain.Giving.Contribution>();
    public DbSet<Domain.Notifications.Notification> Notifications => Set<Domain.Notifications.Notification>();
    public DbSet<Domain.Notifications.WebPushSubscription> WebPushSubscriptions =>
        Set<Domain.Notifications.WebPushSubscription>();
    public DbSet<Domain.Attendance.AttendanceMeetingType> AttendanceMeetingTypes =>
        Set<Domain.Attendance.AttendanceMeetingType>();
    public DbSet<Domain.Attendance.AttendanceMeetingTypeScopeNode> AttendanceMeetingTypeScopeNodes =>
        Set<Domain.Attendance.AttendanceMeetingTypeScopeNode>();
    public DbSet<Domain.Attendance.AttendanceOccurrence> AttendanceOccurrences =>
        Set<Domain.Attendance.AttendanceOccurrence>();
    public DbSet<Domain.Attendance.AttendanceScopeSubmission> AttendanceScopeSubmissions =>
        Set<Domain.Attendance.AttendanceScopeSubmission>();
    public DbSet<Domain.Attendance.AttendanceEntry> AttendanceEntries =>
        Set<Domain.Attendance.AttendanceEntry>();
    public DbSet<Domain.Attendance.AttendanceFirstTimer> AttendanceFirstTimers =>
        Set<Domain.Attendance.AttendanceFirstTimer>();
    public DbSet<Domain.Attendance.AttendanceCellInvitee> AttendanceCellInvitees =>
        Set<Domain.Attendance.AttendanceCellInvitee>();
    public DbSet<Domain.Attendance.AttendanceInviteeEntry> AttendanceInviteeEntries =>
        Set<Domain.Attendance.AttendanceInviteeEntry>();
    public DbSet<Domain.Attendance.AttendanceMeetingPack> AttendanceMeetingPacks =>
        Set<Domain.Attendance.AttendanceMeetingPack>();
    public DbSet<Domain.Attendance.AttendanceMeetingPackFile> AttendanceMeetingPackFiles =>
        Set<Domain.Attendance.AttendanceMeetingPackFile>();
    public DbSet<Domain.Attendance.AttendanceMeetingPackReceipt> AttendanceMeetingPackReceipts =>
        Set<Domain.Attendance.AttendanceMeetingPackReceipt>();
    public DbSet<Domain.Administrators.ChurchAdministrator> ChurchAdministrators =>
        Set<Domain.Administrators.ChurchAdministrator>();
    public DbSet<Domain.Events.ChurchCalendarEvent> ChurchCalendarEvents =>
        Set<Domain.Events.ChurchCalendarEvent>();
    public DbSet<Domain.Authorization.ChurchAbilityOverlay> ChurchAbilityOverlays =>
        Set<Domain.Authorization.ChurchAbilityOverlay>();
    public DbSet<Domain.Account.UserTablePreference> UserTablePreferences =>
        Set<Domain.Account.UserTablePreference>();
    public DbSet<Domain.Media.ChurchServiceRecording> ChurchServiceRecordings =>
        Set<Domain.Media.ChurchServiceRecording>();
    public DbSet<Domain.Media.ServiceRecordingCategory> ServiceRecordingCategories =>
        Set<Domain.Media.ServiceRecordingCategory>();
    public DbSet<Domain.Media.ServiceRecordingSeries> ServiceRecordingSeries =>
        Set<Domain.Media.ServiceRecordingSeries>();
    public DbSet<Domain.Outreach.OutreachChurch> OutreachChurches =>
        Set<Domain.Outreach.OutreachChurch>();

    public DbSet<Domain.Outreach.OutreachAreaCache> OutreachAreaCaches =>
        Set<Domain.Outreach.OutreachAreaCache>();

    public DbSet<Domain.Outreach.SuperadminOperator> SuperadminOperators =>
        Set<Domain.Outreach.SuperadminOperator>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        base.OnModelCreating(b);

        b.Entity<Organization>(e =>
        {
            e.ToTable("organizations");
            e.Property(x => x.Name).IsRequired();
        });

        b.Entity<Church>(e =>
        {
            e.ToTable("churches");
            e.Property(x => x.Name).IsRequired();
            e.HasIndex(x => x.OrganizationId);
            e.HasOne(x => x.Organization)
                .WithMany(o => o.Churches)
                .HasForeignKey(x => x.OrganizationId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<User>(e =>
        {
            e.ToTable("users");
            e.Property(x => x.AuthSubject).IsRequired();
            e.Property(x => x.Name).IsRequired();
            e.Property(x => x.Email).IsRequired();
            e.Property(x => x.Role).HasConversion<string>().IsRequired();
            e.HasIndex(x => x.Email).IsUnique();
            e.HasIndex(x => x.AuthSubject).IsUnique();
            e.HasIndex(x => x.OrganizationId);
            e.HasOne(x => x.Organization)
                .WithMany(o => o.Users)
                .HasForeignKey(x => x.OrganizationId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Church)
                .WithMany()
                .HasForeignKey(x => x.ChurchId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        b.Entity<RefreshToken>(e =>
        {
            e.ToTable("refresh_tokens");
            e.HasIndex(x => x.TokenHash)
                .HasFilter("\"Revoked\" = false");
            e.HasIndex(x => x.UserId);
            e.HasIndex(x => new { x.UserId, x.Revoked });
        });

        b.Entity<OneTimeToken>(e =>
        {
            e.ToTable("one_time_tokens");
            e.Property(x => x.Purpose).HasConversion<string>();
            e.HasIndex(x => x.TokenHash);
            e.HasIndex(x => new { x.TokenHash, x.Purpose });
            e.HasIndex(x => x.UserId);
        });

        b.Entity<EmailConfirmationCode>(e =>
        {
            e.ToTable("email_confirmation_codes");
            e.HasIndex(x => x.UserId);
            e.HasIndex(x => new { x.UserId, x.Code });
        });

        ConfigureStructure(b);
        ConfigureGiving(b);
        ConfigureNotifications(b);
        ConfigureWebPushSubscriptions(b);
        ConfigureAttendance(b);
        ConfigureAdministrators(b);
        ConfigureAbilityOverlays(b);
        ConfigureUserTablePreferences(b);
        ConfigureUnitJoinInvites(b);
        ConfigureServiceRecordings(b);
    }

    private static void ConfigureServiceRecordings(ModelBuilder b)
    {
        b.Entity<Domain.Media.ServiceRecordingCategory>(e =>
        {
            e.ToTable("service_recording_categories");
            e.Property(x => x.Name).IsRequired().HasMaxLength(100);
            e.HasIndex(x => x.ChurchId);
            e.HasIndex(x => new { x.ChurchId, x.Name }).IsUnique();
            e.HasOne(x => x.Church)
                .WithMany()
                .HasForeignKey(x => x.ChurchId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<Domain.Media.ServiceRecordingSeries>(e =>
        {
            e.ToTable("service_recording_series");
            e.Property(x => x.Name).IsRequired().HasMaxLength(100);
            e.Property(x => x.Description).HasMaxLength(500);
            e.HasIndex(x => x.ChurchId);
            e.HasIndex(x => new { x.ChurchId, x.Name }).IsUnique();
            e.HasOne(x => x.Church)
                .WithMany()
                .HasForeignKey(x => x.ChurchId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<Domain.Media.ChurchServiceRecording>(e =>
        {
            e.ToTable("church_service_recordings");
            e.Property(x => x.Title).IsRequired().HasMaxLength(200);
            e.Property(x => x.Description).HasMaxLength(2000);
            e.Property(x => x.BunnyVideoGuid).IsRequired().HasMaxLength(64);
            e.Property(x => x.ThumbnailUrl).HasMaxLength(512);
            e.Property(x => x.CustomThumbnailUrl).HasMaxLength(512);
            e.Property(x => x.Status).HasConversion<string>().IsRequired();
            e.HasIndex(x => x.ChurchId);
            e.HasIndex(x => x.BunnyVideoGuid).IsUnique();
            e.HasIndex(x => new { x.ChurchId, x.PublishedAt });
            e.HasIndex(x => x.CategoryId);
            e.HasIndex(x => x.SeriesId);
            e.HasOne(x => x.Church)
                .WithMany()
                .HasForeignKey(x => x.ChurchId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Category)
                .WithMany(c => c.Recordings)
                .HasForeignKey(x => x.CategoryId)
                .OnDelete(DeleteBehavior.SetNull);
            e.HasOne(x => x.Series)
                .WithMany(s => s.Recordings)
                .HasForeignKey(x => x.SeriesId)
                .OnDelete(DeleteBehavior.SetNull);
        });
    }

    private static void ConfigureUnitJoinInvites(ModelBuilder b)
    {
        b.Entity<Domain.Structure.UnitJoinInvite>(e =>
        {
            e.ToTable("unit_join_invites");
            e.Property(x => x.Token).IsRequired().HasMaxLength(128);
            e.HasIndex(x => x.Token).IsUnique();
            e.HasIndex(x => x.NodeId).IsUnique();
            e.HasIndex(x => x.ChurchId);
        });
    }

    private static void ConfigureUserTablePreferences(ModelBuilder b)
    {
        b.Entity<Domain.Account.UserTablePreference>(e =>
        {
            e.ToTable("user_table_preferences");
            e.Property(x => x.Key).IsRequired().HasMaxLength(80);
            e.Property(x => x.ColumnsJson).IsRequired().HasColumnType("jsonb");
            e.HasIndex(x => new { x.AuthUserId, x.Key }).IsUnique();
            e.HasIndex(x => x.AuthUserId);
        });
    }

    private static void ConfigureAbilityOverlays(ModelBuilder b)
    {
        b.Entity<Domain.Authorization.ChurchAbilityOverlay>(e =>
        {
            e.ToTable("church_ability_overlays");
            e.Property(x => x.SubjectKind).HasConversion<string>().IsRequired();
            e.Property(x => x.Ability).IsRequired().HasMaxLength(80);
            e.HasIndex(x => new { x.ChurchId, x.SubjectKind, x.SubjectId, x.Ability }).IsUnique();
            e.HasIndex(x => x.ChurchId);
        });
    }

    private static void ConfigureAdministrators(ModelBuilder b)
    {
        b.Entity<Domain.Administrators.ChurchAdministrator>(e =>
        {
            e.ToTable("church_administrators");
            e.Property(x => x.FirstName).IsRequired().HasMaxLength(100);
            e.Property(x => x.LastName).IsRequired().HasMaxLength(100);
            e.Property(x => x.Email).IsRequired().HasMaxLength(256);
            e.Property(x => x.AffiliationKind).HasConversion<string>().IsRequired();
            e.HasIndex(x => x.ChurchId);
            e.HasIndex(x => x.AuthUserId);
            e.HasIndex(x => new { x.ChurchId, x.AuthUserId }).IsUnique();
            e.HasIndex(x => x.Email);
            e.HasOne(x => x.Church)
                .WithMany()
                .HasForeignKey(x => x.ChurchId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Member)
                .WithMany()
                .HasForeignKey(x => x.MemberId)
                .OnDelete(DeleteBehavior.SetNull);
        });
    }

    private static void ConfigureAttendance(ModelBuilder b)
    {
        b.Entity<Domain.Attendance.AttendanceMeetingType>(e =>
        {
            e.ToTable("attendance_meeting_types");
            e.Property(x => x.Title).IsRequired().HasMaxLength(200);
            e.Property(x => x.RecurrenceKind).HasConversion<string>().IsRequired();
            e.Property(x => x.ScopeKind).HasConversion<string>().IsRequired();
            e.Property(x => x.IsAlwaysOpen).IsRequired().HasDefaultValue(false);
            e.Property(x => x.RequiresReport).IsRequired().HasDefaultValue(false);
            e.Property(x => x.ReportSchema).HasColumnType("jsonb").HasDefaultValueSql("'[]'::jsonb");
            e.HasIndex(x => x.ChurchId);
            e.HasOne(x => x.Church)
                .WithMany()
                .HasForeignKey(x => x.ChurchId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.SubmissionLayer)
                .WithMany()
                .HasForeignKey(x => x.SubmissionLayerId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        b.Entity<Domain.Attendance.AttendanceMeetingTypeScopeNode>(e =>
        {
            e.ToTable("attendance_meeting_type_scope_nodes");
            e.HasIndex(x => x.MeetingTypeId);
            e.HasIndex(x => new { x.MeetingTypeId, x.StructureNodeId }).IsUnique();
            e.HasOne(x => x.MeetingType)
                .WithMany(t => t.ScopeNodes)
                .HasForeignKey(x => x.MeetingTypeId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<Domain.Attendance.AttendanceOccurrence>(e =>
        {
            e.ToTable("attendance_occurrences");
            e.Property(x => x.Status).HasConversion<string>().IsRequired();
            e.HasIndex(x => x.ChurchId);
            e.HasIndex(x => x.MeetingTypeId);
            e.HasIndex(x => new { x.MeetingTypeId, x.MeetingDate }).IsUnique();
            e.HasOne(x => x.MeetingType)
                .WithMany(t => t.Occurrences)
                .HasForeignKey(x => x.MeetingTypeId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<Domain.Attendance.AttendanceScopeSubmission>(e =>
        {
            e.ToTable("attendance_scope_submissions");
            e.Property(x => x.ApprovalStatus).HasConversion<string>().IsRequired();
            e.Property(x => x.LockStatus).HasConversion<string>().IsRequired();
            e.Property(x => x.EnteredByRole).HasConversion<string>();
            e.Property(x => x.GuestRiskLevel).HasMaxLength(20).HasDefaultValue("clear");
            e.Property(x => x.GuestRiskReasons).HasColumnType("jsonb").HasDefaultValueSql("'[]'::jsonb");
            e.Property(x => x.ReportPayload).HasColumnType("jsonb");
            e.HasIndex(x => x.OccurrenceId);
            e.HasIndex(x => new { x.OccurrenceId, x.ScopeNodeId }).IsUnique();
            e.HasOne(x => x.Occurrence)
                .WithMany(o => o.ScopeSubmissions)
                .HasForeignKey(x => x.OccurrenceId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<Domain.Attendance.AttendanceEntry>(e =>
        {
            e.ToTable("attendance_entries");
            e.Property(x => x.Status).HasConversion<string>().IsRequired();
            e.HasIndex(x => x.OccurrenceId);
            e.HasIndex(x => x.MemberId);
            e.HasIndex(x => new { x.OccurrenceId, x.MemberId }).IsUnique();
            e.HasOne(x => x.Occurrence)
                .WithMany(o => o.Entries)
                .HasForeignKey(x => x.OccurrenceId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Member)
                .WithMany()
                .HasForeignKey(x => x.MemberId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        b.Entity<Domain.Attendance.AttendanceFirstTimer>(e =>
        {
            e.ToTable("attendance_first_timers");
            e.Property(x => x.Name).IsRequired().HasMaxLength(200);
            e.Property(x => x.Phone).HasMaxLength(40);
            e.Property(x => x.Notes).HasMaxLength(500);
            e.HasIndex(x => new { x.OccurrenceId, x.ScopeNodeId });
            e.HasOne(x => x.Occurrence)
                .WithMany()
                .HasForeignKey(x => x.OccurrenceId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<Domain.Attendance.AttendanceCellInvitee>(e =>
        {
            e.ToTable("attendance_cell_invitees");
            e.Property(x => x.Name).IsRequired().HasMaxLength(200);
            e.Property(x => x.Phone).HasMaxLength(40);
            e.Property(x => x.Notes).HasMaxLength(500);
            e.Property(x => x.Residence).HasMaxLength(200);
            e.Property(x => x.OccupationStatus).HasConversion<string>();
            e.Property(x => x.SchoolOrWorkplace).HasMaxLength(200);
            e.Property(x => x.PriorChurchAttendance).HasConversion<string>();
            e.HasIndex(x => new { x.ChurchId, x.CellScopeNodeId, x.IsActive });
            e.HasOne(x => x.GraduatedMember)
                .WithMany()
                .HasForeignKey(x => x.GraduatedMemberId)
                .OnDelete(DeleteBehavior.SetNull);
            e.HasOne(x => x.InvitedByMember)
                .WithMany()
                .HasForeignKey(x => x.InvitedByMemberId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        b.Entity<Domain.Attendance.AttendanceInviteeEntry>(e =>
        {
            e.ToTable("attendance_invitee_entries");
            e.Property(x => x.Status).HasConversion<string>().IsRequired();
            e.HasIndex(x => new { x.OccurrenceId, x.InviteeId }).IsUnique();
            e.HasOne(x => x.Occurrence)
                .WithMany()
                .HasForeignKey(x => x.OccurrenceId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Invitee)
                .WithMany()
                .HasForeignKey(x => x.InviteeId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<Domain.Attendance.AttendanceMeetingPack>(e =>
        {
            e.ToTable("attendance_meeting_packs");
            e.Property(x => x.Note).HasMaxLength(4000);
            e.Property(x => x.ContentFingerprint).IsRequired().HasMaxLength(200);
            e.HasIndex(x => x.OccurrenceId).IsUnique();
            e.HasOne(x => x.Occurrence)
                .WithOne(o => o.Pack)
                .HasForeignKey<Domain.Attendance.AttendanceMeetingPack>(x => x.OccurrenceId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<Domain.Attendance.AttendanceMeetingPackFile>(e =>
        {
            e.ToTable("attendance_meeting_pack_files");
            e.Property(x => x.FileName).IsRequired().HasMaxLength(260);
            e.Property(x => x.StorageKey).IsRequired().HasMaxLength(500);
            e.Property(x => x.ContentType).IsRequired().HasMaxLength(100);
            e.HasIndex(x => x.PackId);
            e.HasOne(x => x.Pack)
                .WithMany(p => p.Files)
                .HasForeignKey(x => x.PackId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<Domain.Attendance.AttendanceMeetingPackReceipt>(e =>
        {
            e.ToTable("attendance_meeting_pack_receipts");
            e.HasIndex(x => new { x.PackId, x.AuthUserId }).IsUnique();
            e.HasOne(x => x.Pack)
                .WithMany(p => p.Receipts)
                .HasForeignKey(x => x.PackId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }

    private static void ConfigureNotifications(ModelBuilder b)
    {
        b.Entity<Domain.Notifications.Notification>(e =>
        {
            e.ToTable("notifications");
            e.Property(x => x.Kind).HasConversion<string>().IsRequired();
            e.Property(x => x.Title).IsRequired().HasMaxLength(200);
            e.Property(x => x.Body).IsRequired().HasMaxLength(500);
            e.Property(x => x.LinkPath).HasMaxLength(300);
            e.HasIndex(x => new { x.RecipientAuthUserId, x.ReadAt, x.CreatedAt });
            e.HasIndex(x => new { x.ChurchId, x.RecipientAuthUserId });
        });
    }

    private static void ConfigureWebPushSubscriptions(ModelBuilder b)
    {
        b.Entity<Domain.Notifications.WebPushSubscription>(e =>
        {
            e.ToTable("push_subscriptions");
            e.Property(x => x.Endpoint).IsRequired().HasMaxLength(2048);
            e.Property(x => x.P256dh).IsRequired().HasMaxLength(256);
            e.Property(x => x.Auth).IsRequired().HasMaxLength(256);
            e.Property(x => x.UserAgent).HasMaxLength(400);
            e.HasIndex(x => x.Endpoint).IsUnique();
            e.HasIndex(x => new { x.AuthUserId, x.ChurchId });
        });
    }

    private static void ConfigureGiving(ModelBuilder b)
    {
        b.Entity<Domain.Giving.GivingProgram>(e =>
        {
            e.ToTable("giving_programs");
            e.Property(x => x.GivingType).HasConversion<string>().IsRequired();
            e.Property(x => x.Title).IsRequired().HasMaxLength(200);
            e.Property(x => x.PeriodLabel).IsRequired().HasMaxLength(80);
            e.Property(x => x.CustomTypeLabel).HasMaxLength(100);
            e.Property(x => x.ScopeKind).HasConversion<string>().IsRequired();
            e.Property(x => x.Status).HasConversion<string>().IsRequired();
            e.Property(x => x.ApprovalStatus).HasConversion<string>().IsRequired();
            e.Property(x => x.ReceiveGivingsOnMain).HasDefaultValue(true);
            e.HasIndex(x => x.ChurchId);
            e.HasIndex(x => new { x.ChurchId, x.Status });
            e.HasIndex(x => new { x.ChurchId, x.ParentProgramId });
            e.HasIndex(x => new { x.ChurchId, x.Status, x.GoLiveAt });
            e.HasIndex(x => new { x.ChurchId, x.ApprovalStatus });
            e.HasIndex(x => x.ParentProgramId);
            e.HasIndex(x => new { x.ChurchId, x.GivingType, x.PeriodLabel, x.ScopeKind })
                .IsUnique()
                .HasFilter("\"ScopeKind\" = 'ChurchWide' AND \"ParentProgramId\" IS NULL");
            e.HasOne(x => x.Church)
                .WithMany()
                .HasForeignKey(x => x.ChurchId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.ParentProgram)
                .WithMany(p => p.ChildPrograms)
                .HasForeignKey(x => x.ParentProgramId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        b.Entity<Domain.Giving.GivingProgramScopeNode>(e =>
        {
            e.ToTable("giving_program_scope_nodes");
            e.HasIndex(x => x.ProgramId);
            e.HasIndex(x => new { x.ProgramId, x.StructureNodeId }).IsUnique();
            e.HasOne(x => x.Program)
                .WithMany(p => p.ScopeNodes)
                .HasForeignKey(x => x.ProgramId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<Domain.Giving.Contribution>(e =>
        {
            e.ToTable("contributions");
            e.Property(x => x.Amount).HasPrecision(14, 2);
            e.Property(x => x.Currency).IsRequired().HasDefaultValue("GHS");
            e.Property(x => x.AttachmentKey).IsRequired().HasMaxLength(500);
            e.Property(x => x.Status).HasConversion<string>().IsRequired();
            e.HasIndex(x => x.ProgramId);
            e.HasIndex(x => x.MemberId);
            e.HasIndex(x => new { x.ProgramId, x.Status });
            e.HasIndex(x => x.MemberParentNodeId);
            e.HasIndex(x => x.BatchId);
            e.HasIndex(x => new { x.ProgramId, x.BatchId });
            e.HasOne(x => x.Program)
                .WithMany(p => p.Contributions)
                .HasForeignKey(x => x.ProgramId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Member)
                .WithMany()
                .HasForeignKey(x => x.MemberId)
                .OnDelete(DeleteBehavior.Restrict);
        });
    }

    private static void ConfigureStructure(ModelBuilder b)
    {
        b.Entity<Domain.Structure.Church>(e =>
        {
            e.ToTable("church_tenants");
            e.Property(x => x.Name).IsRequired();
            e.Property(x => x.CountryCode).HasMaxLength(2);
            e.Property(x => x.DefaultCurrency).IsRequired().HasMaxLength(3).HasDefaultValue("GHS");
            e.Property(x => x.TimeZoneId).IsRequired().HasMaxLength(64).HasDefaultValue("UTC");
        });

        b.Entity<Domain.Structure.Pfcc>(e =>
        {
            e.ToTable("pfccs");
            e.Property(x => x.Name).IsRequired();
            e.HasIndex(x => x.ChurchId);
            e.HasOne(x => x.Church)
                .WithMany(c => c.Pfccs)
                .HasForeignKey(x => x.ChurchId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<Domain.Structure.Fellowship>(e =>
        {
            e.ToTable("structure_fellowships");
            e.Property(x => x.Name).IsRequired();
            e.HasAlternateKey(x => new { x.ChurchId, x.Id });
            e.HasIndex(x => x.ChurchId);
            e.HasIndex(x => x.PfccId);
            e.HasOne(x => x.Church)
                .WithMany(c => c.Fellowships)
                .HasForeignKey(x => x.ChurchId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Pfcc)
                .WithMany(p => p.Fellowships)
                .HasForeignKey(x => x.PfccId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        b.Entity<Domain.Structure.Cell>(e =>
        {
            e.ToTable("structure_cells");
            e.Property(x => x.Name).IsRequired();
            e.HasAlternateKey(x => new { x.ChurchId, x.Id });
            e.HasIndex(x => x.FellowshipId);
            e.HasOne(x => x.Church)
                .WithMany(c => c.Cells)
                .HasForeignKey(x => x.ChurchId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Fellowship)
                .WithMany(f => f.Cells)
                .HasForeignKey(x => new { x.ChurchId, x.FellowshipId })
                .HasPrincipalKey(f => new { f.ChurchId, f.Id })
                .OnDelete(DeleteBehavior.Restrict);
        });

        b.Entity<Domain.Structure.Member>(e =>
        {
            e.ToTable("church_members");
            e.Property(x => x.Name).IsRequired();
            e.Property(x => x.Residence).HasMaxLength(200);
            e.Property(x => x.State).HasMaxLength(8);
            e.Property(x => x.SchoolOrWorkplace).HasMaxLength(200);
            e.Property(x => x.Workplace).HasMaxLength(200);
            e.Property(x => x.Position).HasConversion<string>().IsRequired();
            e.Property(x => x.RosterStatus).HasConversion<string>().IsRequired();
            e.Property(x => x.Responsiveness).HasDefaultValue(3);
            e.HasIndex(x => x.ChurchId);
            e.HasIndex(x => x.ParentNodeId);
            e.HasIndex(x => new { x.ChurchId, x.ParentNodeId });
            e.HasIndex(x => x.AuthUserId);
            e.HasIndex(x => new { x.ChurchId, x.Email });
            e.HasOne(x => x.Church)
                .WithMany(c => c.Members)
                .HasForeignKey(x => x.ChurchId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.ParentNode)
                .WithMany(n => n.Members)
                .HasForeignKey(x => new { x.ChurchId, x.ParentNodeId })
                .HasPrincipalKey(n => new { n.ChurchId, n.Id })
                .OnDelete(DeleteBehavior.Restrict);
        });

        b.Entity<Domain.Structure.StructureTemplate>(e =>
        {
            e.ToTable("structure_templates");
            e.Property(x => x.Name).IsRequired().HasMaxLength(120);
            e.HasIndex(x => x.ChurchId).IsUnique();
            e.HasOne(x => x.Church)
                .WithOne(c => c.Template)
                .HasForeignKey<Domain.Structure.StructureTemplate>(x => x.ChurchId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<Domain.Structure.StructureLayer>(e =>
        {
            e.ToTable("structure_layers");
            e.Property(x => x.StandardType).HasConversion<string>().IsRequired();
            e.Property(x => x.DisplayName).IsRequired();
            e.HasIndex(x => new { x.TemplateId, x.SortOrder }).IsUnique();
            e.HasOne(x => x.Template)
                .WithMany(t => t.Layers)
                .HasForeignKey(x => x.TemplateId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<Domain.Structure.StructureNode>(e =>
        {
            e.ToTable("structure_nodes");
            e.Property(x => x.Name).IsRequired();
            e.HasAlternateKey(x => new { x.ChurchId, x.Id });
            e.HasIndex(x => x.ChurchId);
            e.HasIndex(x => x.LayerId);
            e.HasIndex(x => x.ParentNodeId);
            e.HasIndex(x => new { x.ChurchId, x.ParentNodeId });
            e.HasIndex(x => new { x.ChurchId, x.LayerId });
            e.HasIndex(x => x.LeaderMemberId);
            e.HasIndex(x => new { x.ChurchId, x.ClientRequestId })
                .IsUnique()
                .HasFilter("\"ClientRequestId\" IS NOT NULL");
            e.HasOne(x => x.Church)
                .WithMany(c => c.Nodes)
                .HasForeignKey(x => x.ChurchId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Layer)
                .WithMany(l => l.Nodes)
                .HasForeignKey(x => x.LayerId)
                .OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.ParentNode)
                .WithMany(n => n.Children)
                .HasForeignKey(x => new { x.ChurchId, x.ParentNodeId })
                .HasPrincipalKey(n => new { n.ChurchId, n.Id })
                .OnDelete(DeleteBehavior.Restrict);
            e.Property(x => x.UnitNumber).HasMaxLength(50);
            e.HasOne(x => x.Leader)
                .WithMany()
                .HasForeignKey(x => x.LeaderMemberId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        b.Entity<Domain.Structure.RoleAssignment>(e =>
        {
            e.ToTable("role_assignments");
            e.Property(x => x.Role).HasConversion<string>().IsRequired();
            e.HasIndex(x => x.ChurchId);
            e.HasIndex(x => x.AuthUserId);
            e.HasIndex(x => new { x.ChurchId, x.AuthUserId });
            e.HasIndex(x => new { x.ChurchId, x.ScopeNodeId });
            e.HasIndex(x => new { x.ChurchId, x.Role });
            e.HasOne(x => x.Church)
                .WithMany(c => c.RoleAssignments)
                .HasForeignKey(x => x.ChurchId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.ScopePfcc)
                .WithMany()
                .HasForeignKey(x => x.ScopePfccId)
                .OnDelete(DeleteBehavior.SetNull);
            e.HasOne(x => x.ScopeFellowship)
                .WithMany()
                .HasForeignKey(x => x.ScopeFellowshipId)
                .OnDelete(DeleteBehavior.SetNull);
            e.HasOne(x => x.ScopeCell)
                .WithMany()
                .HasForeignKey(x => x.ScopeCellId)
                .OnDelete(DeleteBehavior.SetNull);
            e.HasOne(x => x.ScopeNode)
                .WithMany()
                .HasForeignKey(x => x.ScopeNodeId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        b.Entity<Domain.Events.ChurchCalendarEvent>(e =>
        {
            e.ToTable("church_calendar_events");
            e.Property(x => x.Title).IsRequired();
            e.HasIndex(x => new { x.ChurchId, x.EventDate });
            e.HasIndex(x => x.ScopeNodeId);
        });

        b.ApplyConfiguration(new OutreachChurchConfiguration());
        b.ApplyConfiguration(new OutreachAreaCacheConfiguration());
        b.ApplyConfiguration(new SuperadminOperatorConfiguration());
    }

    public override int SaveChanges()
    {
        StampTimestamps();
        return base.SaveChanges();
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        StampTimestamps();
        return base.SaveChangesAsync(cancellationToken);
    }

    private void StampTimestamps()
    {
        var now = DateTimeOffset.UtcNow;
        foreach (var entry in ChangeTracker.Entries())
        {
            if (entry.State == EntityState.Added
                && entry.Metadata.FindProperty("CreatedAt") is not null)
            {
                entry.Property("CreatedAt").CurrentValue = now;
            }
        }
    }
}
