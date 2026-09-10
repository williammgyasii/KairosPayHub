using KairosPayHub.Api.Authorization;
using KairosPayHub.Application.Structure;
using Microsoft.Extensions.DependencyInjection;

namespace KairosPayHub.Application;

public static class ApplicationServiceCollectionExtensions
{
    public static IServiceCollection AddKairosApplication(this IServiceCollection services)
    {
        services.AddSingleton<AbilityResolver>();
        services.AddScoped<DeleteStructureTemplate>();
        return services;
    }
}
