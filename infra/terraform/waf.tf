# Opt-in: set manage_waf=true after the API token has Zone WAF Edit.
# Import may be required if rules already exist in the dashboard.
resource "cloudflare_ruleset" "managed_waf" {
  count = var.manage_waf ? 1 : 0

  zone_id     = data.cloudflare_zone.main.id
  name        = "Managed WAF entry point ruleset"
  description = "Cloudflare Managed + OWASP Core (PL2)"
  kind        = "zone"
  phase       = "http_request_firewall_managed"

  rules = [
    {
      ref         = "execute_cloudflare_managed_ruleset"
      description = "Cloudflare Managed Ruleset"
      expression  = "true"
      action      = "execute"
      action_parameters = {
        id = "efb7b8c949ac4650a09736fc376e9aee"
      }
    },
    {
      ref         = "execute_owasp_core_ruleset"
      description = "OWASP Core Ruleset (paranoia level 2)"
      expression  = "true"
      action      = "execute"
      action_parameters = {
        id = "4814384a9e5d4991b9815dcfc25d2f1f"
        overrides = {
          categories = [
            { category = "paranoia-level-3", enabled = false },
            { category = "paranoia-level-4", enabled = false },
          ]
        }
      }
    },
  ]
}
