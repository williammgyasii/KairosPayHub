using KairosPayHub.Api.Domain.Outreach;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace KairosPayHub.Api.Data;

public class OutreachChurchConfiguration : IEntityTypeConfiguration<OutreachChurch>
{
    public void Configure(EntityTypeBuilder<OutreachChurch> e)
    {
        e.ToTable("outreach_churches");
        e.Property(x => x.PlaceId).IsRequired();
        e.Property(x => x.Name).IsRequired();
        e.Property(x => x.Website).IsRequired();
        e.Property(x => x.Email).IsRequired();
        e.Property(x => x.Status).IsRequired();
        e.HasIndex(x => x.PlaceId).IsUnique();
    }
}
