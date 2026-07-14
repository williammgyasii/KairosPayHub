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
EXPOSE 8080
ENTRYPOINT ["dotnet", "KairosPayHub.Api.dll"]
