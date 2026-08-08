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
    public DbSet<Domain.Structure.RoleAssignment> RoleAssignments => Set<Domain.Structure.RoleAssignment>();
    public DbSet<Domain.Structure.StructureTemplate> StructureTemplates => Set<Domain.Structure.StructureTemplate>();
    public DbSet<Domain.Structure.StructureLayer> StructureLayers => Set<Domain.Structure.StructureLayer>();
    public DbSet<Domain.Structure.StructureNode> StructureNodes => Set<Domain.Structure.StructureNode>();
    public DbSet<Domain.Giving.GivingProgram> GivingPrograms => Set<Domain.Giving.GivingProgram>();
    public DbSet<Domain.Giving.GivingProgramScopeNode> GivingProgramScopeNodes =>
        Set<Domain.Giving.GivingProgramScopeNode>();
    public DbSet<Domain.Giving.Contribution> Contributions => Set<Domain.Giving.Contribution>();
    public DbSet<Domain.Notifications.Notification> Notifications => Set<Domain.Notifications.Notification>();

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

    private static void ConfigureGiving(ModelBuilder b)
    {
        b.Entity<Domain.Giving.GivingProgram>(e =>
        {
            e.ToTable("giving_programs");
            e.Property(x => x.GivingType).HasConversion<string>().IsRequired();
            e.Property(x => x.Title).IsRequired().HasMaxLength(200);
            e.Property(x => x.PeriodLabel).IsRequired().HasMaxLength(80);
            e.Property(x => x.ScopeKind).HasConversion<string>().IsRequired();
            e.Property(x => x.Status).HasConversion<string>().IsRequired();
            e.HasIndex(x => x.ChurchId);
            e.HasIndex(x => new { x.ChurchId, x.Status });
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
            e.Property(x => x.Position).HasConversion<string>().IsRequired();
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
