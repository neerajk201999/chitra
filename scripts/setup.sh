#!/usr/bin/env bash
# Chitra one-command bootstrap: verify toolchain, build the core, link the CLI,
# and confirm the environment. Safe to re-run.
set -euo pipefail

cd "$(dirname "$0")/.."
ROOT="$(pwd)"
echo "→ Chitra setup ($ROOT)"

# 1. Node 22.12+
if ! command -v node >/dev/null 2>&1; then
  echo "✖ Node.js not found. Install Node 22.12+ (https://nodejs.org) and re-run." >&2
  exit 1
fi
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
if [ "$NODE_MAJOR" -lt 22 ]; then
  echo "✖ Node $(node -v) is too old. Chitra needs Node 22.12+." >&2
  exit 1
fi
echo "✓ node $(node -v)"

# 2. ffmpeg (hard dependency — render + audio + media)
if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "✖ ffmpeg not found on PATH. Install it (macOS: 'brew install ffmpeg', Debian/Ubuntu: 'sudo apt install ffmpeg') and re-run." >&2
  exit 1
fi
echo "✓ ffmpeg present"

# 3. Build the core (installs deps incl. the vendored Chrome for rendering)
echo "→ installing dependencies + building (first run downloads Chrome, ~1-3 min)…"
cd "$ROOT/core"
npm install --no-audit --no-fund
npx tsc

# 4. Link the `chitra` command globally (best-effort; falls back to node path)
if npm link >/dev/null 2>&1; then
  echo "✓ 'chitra' command linked globally"
  CHITRA="chitra"
else
  echo "• could not npm link (permissions?) — use: node $ROOT/core/dist/cli/index.js <cmd>"
  CHITRA="node $ROOT/core/dist/cli/index.js"
fi

# 5. Probe the environment
echo "→ probing environment…"
$CHITRA probe || true

cat <<EOF

✓ Chitra is ready.
  Next:
    mkdir my-film && cd my-film
    $CHITRA init . --style night --title "My film"
    $CHITRA render score.json -o out.mp4 -q draft

  Agents: read AGENTS.md for the full create → gate → critique loop.
EOF
