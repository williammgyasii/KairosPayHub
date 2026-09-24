using KairosPayHub.Api.Domain.Outreach;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace KairosPayHub.Api.Data;

public class SuperadminOperatorConfiguration : IEntityTypeConfiguration<SuperadminOperator>
{
    public void Configure(EntityTypeBuilder<SuperadminOperator> e)
    {
        e.ToTable("superadmin_operators");
        e.Property(x => x.Email).IsRequired();
        e.Property(x => x.PasswordHash).IsRequired();
        e.HasIndex(x => x.Email).IsUnique();
    }
}
