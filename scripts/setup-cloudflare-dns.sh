#!/usr/bin/env bash
# Legacy DNS helper — gateway cutover uses Workers custom domains instead of Pages CNAMEs.
# See scripts/finish-cloudflare-cutover.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
echo "Gateway mode: run ${ROOT}/scripts/finish-cloudflare-cutover.sh"
echo "  (Worker owns dev.app / app; Pages stays on *.pages.dev)"
exec "${ROOT}/scripts/finish-cloudflare-cutover.sh"
