#!/usr/bin/env bash
# Deploy this repo to the production Lightsail box.
#
# Builds locally (Vite OOMs on the 512 MB box without swap), pushes any DB
# schema changes, scp's dist/ to the server, atomic-swaps it, and restarts
# the systemd unit. Verifies localhost + the public URL before exiting.
#
# Usage:   npm run deploy
#          ./scripts/deploy.sh
#
# Prereqs (one-time):
#   - Run `npm install` so drizzle-kit is available locally for db:push.
#   - `~/.ssh/config` has a `Host pennquinn` block pointing at the Lightsail
#     box with the right key (see DEPLOY-LIGHTSAIL.md "Current Deployment").

set -euo pipefail

REMOTE="pennquinn"
REMOTE_DIR='$HOME/PennQuinncom'
NODE_BIN="/opt/bitnami/node/bin"

# Resolve to repo root
cd "$(cd "$(dirname "$0")/.." && pwd)"

bold()  { printf "\033[1m%s\033[0m\n" "$*"; }
ok()    { printf "\033[32m%s\033[0m\n" "$*"; }
warn()  { printf "\033[33m%s\033[0m\n" "$*" >&2; }
err()   { printf "\033[31m%s\033[0m\n" "$*" >&2; }

head_sha=$(git rev-parse --short HEAD)
head_subject=$(git log -1 --format=%s)
branch=$(git rev-parse --abbrev-ref HEAD)

echo
bold "=========================================="
bold " Deploying PennQuinn.com"
bold "=========================================="
echo "  Local HEAD : ${head_sha} (${head_subject})"
echo "  Branch     : ${branch}"
echo "  Target     : ${REMOTE}"
bold "=========================================="
echo

if [ "${branch}" != "main" ]; then
  warn "WARNING: deploying from '${branch}', not 'main'."
  warn "         Make sure this is what you want — Ctrl-C to abort."
  sleep 3
fi

# ---- Step 1: build locally ----
bold "==> [1/5] Building locally..."
build_log=$(mktemp -t pq-deploy-build.XXXX.log)
if ! npm run build > "${build_log}" 2>&1; then
  err "Build failed. Last lines:"
  tail -30 "${build_log}" >&2
  err "Full log: ${build_log}"
  exit 1
fi
size=$(du -h dist/index.cjs | cut -f1)
ok "    built dist/index.cjs (${size})"

# ---- Step 2: pull DATABASE_URL from server ----
bold "==> [2/5] Reading DATABASE_URL from server's systemd unit..."
db_url=$(ssh -o BatchMode=yes "${REMOTE}" \
  "sudo grep -m1 '^Environment=DATABASE_URL=' /etc/systemd/system/pennquinn.service | sed 's/^Environment=DATABASE_URL=//'")
if [ -z "${db_url}" ]; then
  err "Could not extract DATABASE_URL from /etc/systemd/system/pennquinn.service on ${REMOTE}."
  exit 1
fi
db_host=$(printf '%s' "${db_url}" | sed -E 's|.*@([^/]+).*|\1|')
ok "    using DB at ${db_host}"

# ---- Step 3: apply schema changes (idempotent — no-op if no diff) ----
bold "==> [3/5] Running db:push (idempotent — exits fast if no changes)..."
if ! DATABASE_URL="${db_url}" npm run db:push; then
  err "db:push failed. Aborting before swap so the live site stays on the old bundle."
  exit 1
fi

# ---- Step 4: scp + atomic swap + restart ----
bold "==> [4/5] Uploading dist/, swapping, and restarting service..."
scp -q -o BatchMode=yes -r dist "${REMOTE}:${REMOTE_DIR}/dist.new"
ssh -o BatchMode=yes "${REMOTE}" "
  set -e
  cd ${REMOTE_DIR}
  rm -rf dist.previous.old
  [ -d dist.previous ] && mv dist.previous dist.previous.old || true
  mv dist dist.previous
  mv dist.new dist
  rm -rf dist.previous.old
  sudo systemctl restart pennquinn
"

# ---- Step 5: verify ----
bold "==> [5/5] Verifying..."
sleep 3
local_status=$(ssh -o BatchMode=yes "${REMOTE}" "curl -s -o /dev/null -w '%{http_code}' -m 5 http://localhost:3000/")
if [ "${local_status}" != "200" ]; then
  err "Health check failed: HTTP ${local_status} from localhost:3000."
  err "Logs:     ssh ${REMOTE} 'sudo journalctl -u pennquinn -n 30 --no-pager'"
  err "Rollback: ssh ${REMOTE} 'cd ${REMOTE_DIR} && rm -rf dist.broken; mv dist dist.broken; mv dist.previous dist; sudo systemctl restart pennquinn'"
  exit 1
fi

public_status=$(curl -s -o /dev/null -w '%{http_code}' -m 10 "https://pennquinn.com/?_=$(date +%s)" || echo "??")

echo
bold "=========================================="
ok   " DEPLOYED  ✓"
bold "=========================================="
echo "  localhost:3000  HTTP ${local_status}"
echo "  pennquinn.com   HTTP ${public_status} (via Cloudflare)"
echo "  Rollback:       ssh ${REMOTE} 'cd ${REMOTE_DIR} && mv dist dist.broken && mv dist.previous dist && sudo systemctl restart pennquinn'"
bold "=========================================="
