#!/usr/bin/env bash
# Register www + apex on the kairospayhub-marketing Pages project (DNS must already point at Pages).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID:-e23518956f08ff35812d9ab001a39880}"
PROJECT="kairospayhub-marketing"

oauth=$(cd "${ROOT}/cloudflare/api" && unset CLOUDFLARE_API_KEY CLOUDFLARE_EMAIL CLOUDFLARE_API_TOKEN && npx wrangler auth token 2>/dev/null | tail -1)
if [[ -z "$oauth" ]]; then
  echo "Run: cd cloudflare/api && npx wrangler login"
  echo "Or add custom domains in Dashboard → Workers & Pages → ${PROJECT} → Custom domains"
  exit 1
fi

add_domain() {
  local hostname=$1
  curl -sS -X POST "https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/pages/projects/${PROJECT}/domains" \
    -H "Authorization: Bearer ${oauth}" -H "Content-Type: application/json" \
    --data "{\"name\":\"${hostname}\"}" \
    | python3 -c "import json,sys; d=json.load(sys.stdin); print('domain', '${hostname}', 'success=', d.get('success'), 'errors=', d.get('errors'))"
}

echo "==> Attach Pages custom domains"
add_domain "www.kairospayhub.com"
add_domain "kairospayhub.com"
echo "Done. SSL may take a few minutes."
