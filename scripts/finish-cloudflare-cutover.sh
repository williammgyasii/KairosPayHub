#!/usr/bin/env bash
# Finish DNS cutover for single-domain gateway (Worker on app hostname → API + Pages).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${ROOT}/.env"
ZONE_ID="${CLOUDFLARE_ZONE_ID:-af8d83ae12afddf74c75b61a15839a90}"
ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID:-e23518956f08ff35812d9ab001a39880}"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

if [[ -z "${CLOUDFLARE_API_TOKEN:-}" ]]; then
  echo "Missing CLOUDFLARE_API_TOKEN in .env (Zone DNS Edit on kairospayhub.com)"
  exit 1
fi

delete_cname() {
  local name=$1
  local existing
  existing=$(curl -sS "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records?type=CNAME&name=${name}" \
    -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
    | python3 -c "import json,sys; r=json.load(sys.stdin).get('result',[]); print(r[0]['id'] if r else '')")
  if [[ -n "$existing" ]]; then
    curl -sS -X DELETE "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records/${existing}" \
      -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" >/dev/null
    echo "deleted CNAME ${name}"
  fi
}

worker_custom_domain() {
  local hostname=$1
  local service=$2
  local oauth
  oauth=$(cd "${ROOT}/cloudflare/api" && unset CLOUDFLARE_API_KEY CLOUDFLARE_EMAIL CLOUDFLARE_API_TOKEN && npx wrangler auth token 2>/dev/null | tail -1)
  if [[ -z "$oauth" ]]; then
    echo "Skipping ${hostname}: run 'cd cloudflare/api && npx wrangler login'"
    return 0
  fi
  delete_cname "${hostname}"
  curl -sS -X PUT "https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/workers/domains" \
    -H "Authorization: Bearer ${oauth}" -H "Content-Type: application/json" \
    --data "{\"hostname\":\"${hostname}\",\"service\":\"${service}\",\"environment\":\"production\",\"zone_id\":\"${ZONE_ID}\"}" \
    | python3 -c "import json,sys; d=json.load(sys.stdin); print('worker domain', '${hostname}', d.get('success'), d.get('errors'))"
}

remove_pages_custom_domain() {
  local project=$1
  local hostname=$2
  local oauth
  oauth=$(cd "${ROOT}/cloudflare/api" && unset CLOUDFLARE_API_KEY CLOUDFLARE_EMAIL CLOUDFLARE_API_TOKEN && npx wrangler auth token 2>/dev/null | tail -1)
  if [[ -z "$oauth" ]]; then
    return 0
  fi
  curl -sS -X DELETE "https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/pages/projects/${project}/domains/${hostname}" \
    -H "Authorization: Bearer ${oauth}" \
    | python3 -c "import json,sys; d=json.load(sys.stdin); print('pages domain removed', '${hostname}', d.get('success'), d.get('errors'))"
}

echo "==> Remove Pages custom domains (Worker owns app hostnames)"
remove_pages_custom_domain "kairospayhub-frontend-dev" "dev.app.kairospayhub.com"
remove_pages_custom_domain "kairospayhub-frontend" "app.kairospayhub.com"

echo "==> Gateway custom domains"
worker_custom_domain "dev.app.kairospayhub.com" "kairospayhub-api-dev"
worker_custom_domain "app.kairospayhub.com" "kairospayhub-api"

echo "==> Waiting for DNS (30s)"
sleep 30

echo "==> Verify"
curl -sf "https://dev.app.kairospayhub.com/health" && echo " dev.app /health ok" || echo " dev.app /health not ready"
curl -sfI "https://dev.app.kairospayhub.com/" | head -1 || true
curl -sf "https://app.kairospayhub.com/health" && echo " app /health ok" || echo " app /health not ready"
curl -sfI "https://app.kairospayhub.com/" | head -1 || true

echo "Done."
