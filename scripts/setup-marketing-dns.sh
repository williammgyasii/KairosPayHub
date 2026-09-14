#!/usr/bin/env bash
# Point apex + www at the marketing Cloudflare Pages project (create/deploy site later).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${ROOT}/.env"
ZONE_ID="${CLOUDFLARE_ZONE_ID:-af8d83ae12afddf74c75b61a15839a90}"
APEX_TARGET="${MARKETING_APEX_TARGET:-kairospayhub-marketing.pages.dev}"
# Proxied A records for www (same Cloudflare anycast as flattened CNAME)
WWW_A_IPS="${MARKETING_WWW_A_IPS:-104.21.14.226 172.67.204.138}"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

if [[ -z "${CLOUDFLARE_API_TOKEN:-}" ]]; then
  echo "Missing CLOUDFLARE_API_TOKEN in .env (Zone — DNS — Edit on kairospayhub.com)"
  exit 1
fi

ensure_cname() {
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

ensure_a() {
  local name=$1
  local ip=$2
  local existing
  existing=$(curl -sS "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records?type=A&name=${name}" \
    -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
    | python3 -c "import json,sys; r=[x for x in json.load(sys.stdin).get('result',[]) if x.get('content')=='${ip}']; print(r[0]['id'] if r else '')")
  local payload
  payload=$(python3 -c "import json; print(json.dumps({'type':'A','name':'${name}','content':'${ip}','proxied':True,'ttl':1}))")
  if [[ -n "$existing" ]]; then
    echo "OK (exists): ${name} A ${ip}"
  else
    curl -sS -X POST "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records" \
      -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" -H "Content-Type: application/json" \
      --data "$payload" \
      | python3 -c "import json,sys; d=json.load(sys.stdin); print('created', '${name}', 'A', '${ip}', d.get('success'), d.get('errors'))"
  fi
}

echo "==> Marketing DNS apex CNAME → ${APEX_TARGET}, www proxied A"
ensure_cname "kairospayhub.com" "${APEX_TARGET}"
for ip in ${WWW_A_IPS}; do
  ensure_a "www.kairospayhub.com" "${ip}"
done
echo "Done. Attach site: create Pages project kairospayhub-marketing, deploy, add custom domains."
