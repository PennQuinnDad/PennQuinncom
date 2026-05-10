#!/usr/bin/env bash
# Deploy this repo to the production Lightsail box.
#
# Builds locally (Vite OOMs on the 512 MB box without swap), pushes any DB
# schema changes from the server (the DB is VPC-private, not reachable
# from your laptop), scp's dist/ to the server, atomic-swaps it, and
# restarts the systemd unit. Verifies localhost + the public URL.
#
# Usage:   npm run deploy
#          ./scripts/deploy.sh
#
# Prereqs (one-time):
#   - `~/.ssh/config` has a `Host pennquinn` block pointing at the Lightsail
#     box with the right key (see DEPLOY-LIGHTSAIL.md "Current Deployment").

set -euo pipefail

REMOTE="pennquinn"
REMOTE_DIR="/home/bitnami/PennQuinncom"
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
echo "  Target     : ${REMOTE} (${REMOTE_DIR})"
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

# ---- Step 2: sync server source + run db:push ON the server ----
# The DB is on a VPC-private IP and not reachable from your laptop,
# so db:push has to run on the box. We also fast-forward the server's
# git checkout so drizzle-kit sees the new schema.ts.
bold "==> [2/5] Syncing server git checkout and running db:push..."
if ! ssh -o BatchMode=yes "${REMOTE}" bash <<EOF
set -e
export PATH="${NODE_BIN}:\$PATH"
cd ${REMOTE_DIR}
git fetch origin main
git reset --hard origin/main
echo "    server source -> \$(git rev-parse --short HEAD)"
DB_URL=\$(sudo grep -m1 '^Environment=DATABASE_URL=' /etc/systemd/system/pennquinn.service | sed 's/^Environment=DATABASE_URL=//')
if [ -z "\$DB_URL" ]; then
  echo 'ERROR: could not extract DATABASE_URL from systemd unit' >&2
  exit 1
fi
DATABASE_URL="\$DB_URL" npm run db:push
EOF
then
  err "Step 2 failed. Aborting before any production write so the live site stays on the old bundle."
  exit 1
fi

# ---- Step 3: scp dist/ to server ----
bold "==> [3/5] Uploading dist/ to ${REMOTE_DIR}/dist.new ..."
scp -q -o BatchMode=yes -r dist "${REMOTE}:${REMOTE_DIR}/dist.new"

# ---- Step 4: atomic swap + restart ----
bold "==> [4/5] Atomic-swapping dist/ and restarting service..."
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
