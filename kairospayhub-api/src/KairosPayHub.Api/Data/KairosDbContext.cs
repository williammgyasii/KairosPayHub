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
    public DbSet<Record> Records => Set<Record>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<OneTimeToken> OneTimeTokens => Set<OneTimeToken>();
    public DbSet<EmailConfirmationCode> EmailConfirmationCodes => Set<EmailConfirmationCode>();

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

        b.Entity<Record>(e =>
        {
            e.ToTable("records");
            e.Property(x => x.Amount).HasPrecision(14, 2);
            e.Property(x => x.Currency).IsRequired().HasDefaultValue("GHS");
            e.Property(x => x.Method).HasConversion<string>().IsRequired();
            e.Property(x => x.Source)
                .HasConversion<string>()
                .IsRequired()
                .HasDefaultValue(RecordSource.Manual);
            e.Property(x => x.Status)
                .HasConversion<string>()
                .IsRequired()
                .HasDefaultValue(RecordStatus.Submitted);
            e.HasIndex(x => x.OrganizationId);
            e.HasIndex(x => x.ChurchId);
            e.HasOne(x => x.Church)
                .WithMany()
                .HasForeignKey(x => x.ChurchId)
                .OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.SubmittedBy)
                .WithMany()
                .HasForeignKey(x => x.SubmittedById)
                .OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.VerifiedBy)
                .WithMany()
                .HasForeignKey(x => x.VerifiedById)
                .OnDelete(DeleteBehavior.SetNull);
        });

        b.Entity<RefreshToken>(e =>
        {
            e.ToTable("refresh_tokens");
            e.HasIndex(x => x.TokenHash);
            e.HasIndex(x => x.UserId);
        });

        b.Entity<OneTimeToken>(e =>
        {
            e.ToTable("one_time_tokens");
            e.Property(x => x.Purpose).HasConversion<string>();
            e.HasIndex(x => x.TokenHash);
        });

        b.Entity<EmailConfirmationCode>(e =>
        {
            e.ToTable("email_confirmation_codes");
            e.HasIndex(x => x.UserId);
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
            if (entry.Entity is Record rec)
            {
                if (entry.State == EntityState.Added)
                {
                    rec.CreatedAt = now;
                    rec.UpdatedAt = now;
                }
                else if (entry.State == EntityState.Modified)
                {
                    rec.UpdatedAt = now;
                }
            }
            else if (entry.State == EntityState.Added
                && entry.Metadata.FindProperty("CreatedAt") is not null)
            {
                entry.Property("CreatedAt").CurrentValue = now;
            }
        }
    }
}
