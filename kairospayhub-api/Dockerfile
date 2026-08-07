FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY KairosPayHub.slnx ./
COPY src/KairosPayHub.Api/KairosPayHub.Api.csproj src/KairosPayHub.Api/
RUN dotnet restore src/KairosPayHub.Api/KairosPayHub.Api.csproj

COPY src/ src/
RUN dotnet publish src/KairosPayHub.Api/KairosPayHub.Api.csproj -c Release -o /app --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
COPY --from=build /app ./

ENV ASPNETCORE_URLS=http://+:8080
# Render starter instances hit Linux inotify limits if appsettings reload is enabled.
ENV DOTNET_HOSTBUILDER__RELOADCONFIGONCHANGE=false
EXPOSE 8080
ENTRYPOINT ["dotnet", "KairosPayHub.Api.dll"]
