#!/usr/bin/env bash
# Point app/api hostnames at Cloudflare Pages + Workers (replace Render CNAMEs).
# Requires Cloudflare API token with Zone.DNS Edit (or run in dashboard).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${ROOT}/.env"
ZONE_ID="${CLOUDFLARE_ZONE_ID:-af8d83ae12afddf74c75b61a15839a90}"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

TOKEN="${CLOUDFLARE_API_TOKEN:-}"
if [[ -z "$TOKEN" && -n "${CLOUDFLARE_API_KEY:-}" && "${CLOUDFLARE_API_KEY}" == cfat_* ]]; then
  TOKEN="${CLOUDFLARE_API_KEY}"
fi

if [[ -z "$TOKEN" ]]; then
  echo "Set CLOUDFLARE_API_TOKEN (Zone.DNS Edit) in .env, or update DNS manually:"
  echo "  dev.api.kairospayhub.com  -> keep existing A/CNAME (Worker route binds on zone)"
  echo "  api.kairospayhub.com      -> keep existing A/CNAME (Worker route binds on zone)"
  echo "  dev.app.kairospayhub.com  -> kairospayhub-frontend-dev.pages.dev"
  echo "  app.kairospayhub.com      -> kairospayhub-frontend.pages.dev"
  exit 1
fi

upsert_cname() {
  local name=$1
  local target=$2
  local existing
  existing=$(curl -sS "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records?type=CNAME&name=${name}" \
    -H "Authorization: Bearer ${TOKEN}" | python3 -c "import json,sys; r=json.load(sys.stdin).get('result',[]); print(r[0]['id'] if r else '')")

  if [[ -n "$existing" ]]; then
    curl -sS -X PUT "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records/${existing}" \
      -H "Authorization: Bearer ${TOKEN}" -H "Content-Type: application/json" \
      --data "{\"type\":\"CNAME\",\"name\":\"${name}\",\"content\":\"${target}\",\"proxied\":true,\"ttl\":1}" \
      | python3 -c "import json,sys; d=json.load(sys.stdin); print('updated', '${name}', d.get('success'))"
  else
    curl -sS -X POST "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records" \
      -H "Authorization: Bearer ${TOKEN}" -H "Content-Type: application/json" \
      --data "{\"type\":\"CNAME\",\"name\":\"${name}\",\"content\":\"${target}\",\"proxied\":true,\"ttl\":1}" \
      | python3 -c "import json,sys; d=json.load(sys.stdin); print('created', '${name}', d.get('success'))"
  fi
}

echo "==> Pages frontends"
upsert_cname "dev.app.kairospayhub.com" "kairospayhub-frontend-dev.pages.dev"
upsert_cname "app.kairospayhub.com" "kairospayhub-frontend.pages.dev"

echo ""
echo "API hostnames use Worker zone routes (dev.api / api) — no DNS change required if records already exist in-zone."
echo "Done."
