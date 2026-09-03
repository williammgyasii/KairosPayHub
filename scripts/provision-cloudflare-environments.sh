#!/usr/bin/env bash
# Provision Cloudflare Pages + Workers/Containers + Neon for KairosPayHub.
# Requires: wrangler, docker, neonctl (optional for prod DB), repo .env with Cloudflare + Neon vars.
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

# Invalid keys in .env must not override wrangler OAuth login.
if [[ -z "${CLOUDFLARE_API_TOKEN:-}" ]]; then
  unset CLOUDFLARE_API_KEY CLOUDFLARE_EMAIL
fi

wrangler() {
  command npx wrangler "$@"
}

export CLOUDFLARE_ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID:-e23518956f08ff35812d9ab001a39880}"
if [[ -n "${CLOUDFLARE_API_TOKEN:-}" ]]; then
  export CLOUDFLARE_API_TOKEN
  unset CLOUDFLARE_API_KEY CLOUDFLARE_EMAIL
elif [[ -n "${CLOUDFLARE_API_KEY:-}" && "${CLOUDFLARE_API_KEY}" == cfat_* ]]; then
  export CLOUDFLARE_API_TOKEN="${CLOUDFLARE_API_KEY}"
  unset CLOUDFLARE_API_KEY CLOUDFLARE_EMAIL
fi

DEV_DB="${NEON_DEV_CONNECTION_STRING:-${ConnectionStrings__Default:-}}"
if [[ -z "$DEV_DB" ]]; then
  echo "Set NEON_DEV_CONNECTION_STRING or ConnectionStrings__Default in .env"
  exit 1
fi

JWT_KEY="${JWT_SIGNING_KEY:-${Jwt__SigningKey:-local-dev-signing-key-min-32-chars!!}}"
if [[ ${#JWT_KEY} -lt 32 ]]; then
  echo "Jwt__SigningKey must be at least 32 characters"
  exit 1
fi

put_secrets() {
  local env_flag=$1
  local db_url=$2
  local jwt_key=$3
  local r2_public=$5
  local secrets_file
  secrets_file="$(mktemp)"
  trap 'rm -f "$secrets_file"' RETURN

  cat >"$secrets_file" <<EOF
DB_CONNECTION_STRING=$db_url
JWT_SIGNING_KEY=$jwt_key
EMAIL_SMTP_HOST=${Email__Smtp__Host:-smtp.resend.com}
EMAIL_SMTP_USERNAME=${Email__Smtp__Username:-resend}
EMAIL_SMTP_PASSWORD=${Email__Smtp__Password:-}
EMAIL_FROM_ADDRESS=${Email__FromAddress:-noreply@kairospayhub.com}
R2_PUBLIC_BASE_URL=$r2_public
R2_ACCESS_KEY_ID=${R2__AccessKeyId:-${CLOUDFLARE_R2_ACCESS_KEY_ID:-}}
R2_SECRET_ACCESS_KEY=${R2__SecretAccessKey:-${CLOUDFLARE_R2_SECRET_ACCESS_KEY:-}}
R2_ENDPOINT=${R2__Endpoint:-${CLOUDFLARE_R2_ENDPOINT:-}}
EOF

  wrangler secret bulk "$secrets_file" $env_flag 2>/dev/null || {
    echo "    (bulk upload unavailable — setting secrets individually)"
    while IFS='=' read -r key value; do
      [[ -z "$key" || "$key" == \#* ]] && continue
      printf '%s' "$value" | wrangler secret put "$key" $env_flag
      sleep 3
    done <"$secrets_file"
  }
}

deploy_api() {
  local env_name=$1
  local db_url=$2
  local jwt_key=$3
  local r2_public=$4
  local secrets_file
  secrets_file="$(mktemp)"
  trap 'rm -f "$secrets_file"' RETURN

  python3 - "$secrets_file" <<'PY' "$db_url" "$jwt_key" "$r2_public"
import json, os, sys
out, db, jwt, r2 = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
secrets = {
  "DB_CONNECTION_STRING": db,
  "JWT_SIGNING_KEY": jwt,
  "EMAIL_SMTP_HOST": os.environ.get("Email__Smtp__Host", "smtp.resend.com"),
  "EMAIL_SMTP_USERNAME": os.environ.get("Email__Smtp__Username", "resend"),
  "EMAIL_SMTP_PASSWORD": os.environ.get("Email__Smtp__Password", ""),
  "EMAIL_FROM_ADDRESS": os.environ.get("Email__FromAddress", "noreply@kairospayhub.com"),
  "R2_PUBLIC_BASE_URL": r2,
  "R2_ACCESS_KEY_ID": os.environ.get("R2__AccessKeyId") or os.environ.get("CLOUDFLARE_R2_ACCESS_KEY_ID", ""),
  "R2_SECRET_ACCESS_KEY": os.environ.get("R2__SecretAccessKey") or os.environ.get("CLOUDFLARE_R2_SECRET_ACCESS_KEY", ""),
  "R2_ENDPOINT": os.environ.get("R2__Endpoint") or os.environ.get("CLOUDFLARE_R2_ENDPOINT", ""),
}
with open(out, "w") as f:
  json.dump(secrets, f)
PY

  wrangler deploy --env "$env_name" --secrets-file "$secrets_file"
}

echo "==> Installing API worker dependencies"
cd "${ROOT}/cloudflare/api"
npm ci

echo "==> Ensuring Pages projects exist"
wrangler pages project create kairospayhub-frontend-dev --production-branch main 2>/dev/null || true
wrangler pages project create kairospayhub-frontend --production-branch main 2>/dev/null || true

echo "==> Setting development API secrets"
put_secrets "--env development" "$DEV_DB" "$JWT_KEY" "kairospayhub-assets-dev" "${R2__PublicBaseUrl:-}" || true

if [[ -n "${NEON_PROD_CONNECTION_STRING:-}" ]]; then
  echo "==> Setting production API secrets"
  put_secrets "--env production" "$NEON_PROD_CONNECTION_STRING" "${JWT_PROD_SIGNING_KEY:-$JWT_KEY}" "kairospayhub-assets" "${R2_PROD_PUBLIC_BASE_URL:-${R2__PublicBaseUrl:-}}" || true
else
  echo "==> Skipping prod secrets (set NEON_PROD_CONNECTION_STRING to provision prod)"
fi

echo "==> Deploying development API (Docker must be running)"
deploy_api "development" "$DEV_DB" "$JWT_KEY" "${R2__PublicBaseUrl:-}"

echo "==> Building + deploying development frontend"
cd "${ROOT}/kairospayhub-frontend"
npm ci
VITE_API_URL=https://dev.api.kairospayhub.com npm run build
wrangler pages deploy dist --project-name kairospayhub-frontend-dev --branch main

if [[ -n "${NEON_PROD_CONNECTION_STRING:-}" ]]; then
  echo "==> Deploying production API"
  cd "${ROOT}/cloudflare/api"
  deploy_api "production" "$NEON_PROD_CONNECTION_STRING" "${JWT_PROD_SIGNING_KEY:-$JWT_KEY}" "${R2_PROD_PUBLIC_BASE_URL:-${R2__PublicBaseUrl:-}}"

  echo "==> Building + deploying production frontend"
  cd "${ROOT}/kairospayhub-frontend"
  VITE_API_URL=https://api.kairospayhub.com npm run build
  wrangler pages deploy dist --project-name kairospayhub-frontend --branch main
fi

echo ""
echo "Done. Verify:"
echo "  curl -s https://dev.api.kairospayhub.com/health"
echo "  curl -sI https://dev.app.kairospayhub.com/"
if [[ -n "${NEON_PROD_CONNECTION_STRING:-}" ]]; then
  echo "  curl -s https://api.kairospayhub.com/health"
  echo "  curl -sI https://app.kairospayhub.com/"
fi
