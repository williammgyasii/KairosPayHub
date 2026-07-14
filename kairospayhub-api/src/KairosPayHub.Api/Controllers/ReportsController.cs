using System.Text;
using KairosPayHub.Api.Auth;
using KairosPayHub.Api.Domain;
using KairosPayHub.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace KairosPayHub.Api.Controllers;

[ApiController]
[Route("api/reports")]
[Authorize]
public class ReportsController(CurrentActor current, ReportService reports) : ControllerBase
{
    [HttpGet("export")]
    public async Task<IActionResult> Export(
        [FromQuery] Guid? churchId,
        [FromQuery] RecordStatus? status,
        CancellationToken ct)
    {
        var actor = await current.RequireAsync(ct);
        var csv = await reports.ExportCsvAsync(actor, new RecordFilters(churchId, status), ct);
        return File(Encoding.UTF8.GetBytes(csv), "text/csv", "records.csv");
    }
}
