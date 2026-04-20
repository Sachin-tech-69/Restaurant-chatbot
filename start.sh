#!/bin/bash
echo ""
echo "  🍛  Starting Dilli Darbar Restaurant Chatbot..."
echo "  ─────────────────────────────────────────────"
echo ""

# Node 22.5+ has SQLite stable, older versions need --experimental-sqlite
NODE_VER=$(node -e "process.stdout.write(process.version)")
echo "  Node.js version: $NODE_VER"

cd "$(dirname "$0")/backend"

if node -e "require('node:sqlite')" 2>/dev/null; then
  echo "  ✅  SQLite available"
  node server.js
else
  echo "  ⚠️  Using --experimental-sqlite flag"
  node --experimental-sqlite server.js
fi
