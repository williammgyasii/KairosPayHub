using KairosPayHub.Api.Domain.Outreach;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace KairosPayHub.Api.Data;

public class OutreachAreaCacheConfiguration : IEntityTypeConfiguration<OutreachAreaCache>
{
    public void Configure(EntityTypeBuilder<OutreachAreaCache> e)
    {
        e.ToTable("outreach_area_caches");
        e.Property(x => x.City).IsRequired();
        e.Property(x => x.State).IsRequired();
        e.HasIndex(x => new { x.City, x.State, x.RadiusMiles }).IsUnique();
    }
}
