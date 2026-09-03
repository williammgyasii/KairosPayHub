#!/usr/bin/env bash
# Finish DNS cutover + verify Cloudflare deployment.
# Requires CLOUDFLARE_API_TOKEN with Zone.DNS Edit on kairospayhub.com
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

if [[ -z "${CLOUDFLARE_API_TOKEN:-}" ]]; then
  echo "Missing CLOUDFLARE_API_TOKEN in .env"
  echo "Create one: https://dash.cloudflare.com/profile/api-tokens/create?template=Edit%20zone%20DNS"
  echo "Permissions: Zone DNS Edit + Zone Zone Read on kairospayhub.com"
  exit 1
fi

upsert_cname() {
  local name=$1
  local target=$2
  local existing
  existing=$(curl -sS "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records?type=CNAME&name=${name}" \
    -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
    | python3 -c "import json,sys; r=json.load(sys.stdin).get('result',[]); print(r[0]['id'] if r else '')")

  local payload
  payload=$(python3 -c "import json; print(json.dumps({'type':'CNAME','name':'${name}','content':'${target}','proxied':True,'ttl':1}))")

  if [[ -n "$existing" ]]; then
    curl -sS -X PUT "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records/${existing}" \
      -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" -H "Content-Type: application/json" \
      --data "$payload" \
      | python3 -c "import json,sys; d=json.load(sys.stdin); print('updated', '${name}', d.get('success'), d.get('errors'))"
  else
    curl -sS -X POST "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records" \
      -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" -H "Content-Type: application/json" \
      --data "$payload" \
      | python3 -c "import json,sys; d=json.load(sys.stdin); print('created', '${name}', d.get('success'), d.get('errors'))"
  fi
}

echo "==> DNS: Pages frontends"
upsert_cname "dev.app.kairospayhub.com" "kairospayhub-frontend-dev.pages.dev"
upsert_cname "app.kairospayhub.com" "kairospayhub-frontend.pages.dev"

echo "==> DNS: API"
upsert_cname "api.kairospayhub.com" "kairospayhub-api.williammgyasii.workers.dev"

# dev.api is a two-level subdomain — needs Workers custom domain (auto SSL), not manual CNAME.
echo "==> Workers custom domain: dev.api (requires wrangler OAuth, not DNS token)"
if command -v npx >/dev/null; then
  (
    unset CLOUDFLARE_API_KEY CLOUDFLARE_EMAIL CLOUDFLARE_API_TOKEN
    cd "${ROOT}/cloudflare/api"
    OAUTH=$(npx wrangler auth token 2>/dev/null | tail -1)
    if [[ -n "$OAUTH" ]]; then
      DEV_ID=$(curl -sS "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records?name=dev.api.kairospayhub.com" \
        -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
        | python3 -c "import json,sys; r=json.load(sys.stdin).get('result',[]); print(r[0]['id'] if r else '')")
      [[ -n "$DEV_ID" ]] && curl -sS -X DELETE "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records/${DEV_ID}" \
        -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" >/dev/null || true
      curl -sS -X PUT "https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/workers/domains" \
        -H "Authorization: Bearer ${OAUTH}" -H "Content-Type: application/json" \
        --data "{\"hostname\":\"dev.api.kairospayhub.com\",\"service\":\"kairospayhub-api-dev\",\"environment\":\"production\",\"zone_id\":\"${ZONE_ID}\"}" \
        | python3 -c "import json,sys; d=json.load(sys.stdin); print('dev.api worker domain:', d.get('success'), d.get('errors'))"
    fi
  )
fi

echo "==> Waiting for DNS (30s)"
sleep 30

echo "==> Verify"
curl -sf "https://dev.api.kairospayhub.com/health" && echo " dev.api ok" || echo " dev.api not ready yet"
curl -sf "https://api.kairospayhub.com/health" && echo " api ok" || echo " api not ready yet"
curl -sfI "https://dev.app.kairospayhub.com/" | head -1 || true
curl -sfI "https://app.kairospayhub.com/" | head -1 || true

echo "Done."
