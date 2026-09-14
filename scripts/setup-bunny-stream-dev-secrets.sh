#!/usr/bin/env bash
# Push Bunny Stream secrets from repo .env to the development gateway Worker.
# Non-secret config (library id, feature flag) lives in cloudflare/api/wrangler.jsonc vars.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${ROOT}/.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE — copy from .env.example"
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

if [[ -z "${CLOUDFLARE_API_TOKEN:-}" ]]; then
  unset CLOUDFLARE_API_KEY CLOUDFLARE_EMAIL
fi

export CLOUDFLARE_ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID:-e23518956f08ff35812d9ab001a39880}"

API_KEY="${BunnyStream__ApiKey:-}"
WEBHOOK_SECRET="${BunnyStream__WebhookSecret:-}"
TOKEN_KEY="${BunnyStream__TokenSecurityKey:-}"

if [[ -z "$API_KEY" ]]; then
  echo "Set BunnyStream__ApiKey in .env (Stream → Library → API → library key)"
  exit 1
fi

if [[ -z "$WEBHOOK_SECRET" ]]; then
  echo "Set BunnyStream__WebhookSecret in .env (Stream → Library → API → Read-only key)"
  exit 1
fi

cd "${ROOT}/cloudflare/api"

wrangler() {
  command npx wrangler "$@"
}

echo "==> Uploading Bunny Stream secrets to kairospayhub-api-dev"
printf '%s' "$API_KEY" | wrangler secret put BUNNY_STREAM_API_KEY --env development
printf '%s' "$WEBHOOK_SECRET" | wrangler secret put BUNNY_STREAM_WEBHOOK_SECRET --env development

if [[ -n "$TOKEN_KEY" ]]; then
  printf '%s' "$TOKEN_KEY" | wrangler secret put BUNNY_STREAM_TOKEN_SECURITY_KEY --env development
  echo "    BUNNY_STREAM_TOKEN_SECURITY_KEY set"
else
  echo "    Skipping BUNNY_STREAM_TOKEN_SECURITY_KEY (enable embed token auth in Bunny, then set BunnyStream__TokenSecurityKey)"
fi

echo ""
echo "Done. Redeploy dev API if the container is already running:"
echo "  cd cloudflare/api && npx wrangler deploy --env development"
echo ""
echo "Webhook URL (configure in Bunny Stream library):"
echo "  https://dev.app.kairospayhub.com/api/webhooks/bunny-stream"
