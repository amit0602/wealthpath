#!/bin/bash
# WealthPath dev launcher — starts backend + Expo web in two Terminal tabs

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Open backend in a new Terminal tab
osascript <<EOF
tell application "Terminal"
  activate
  set backendTab to do script "cd '$SCRIPT_DIR/backend' && echo '=== Starting WealthPath Backend ===' && npm run start:dev"
end tell
EOF

sleep 1

# Open Expo in another Terminal tab
osascript <<EOF
tell application "Terminal"
  activate
  set expoTab to do script "cd '$SCRIPT_DIR/mobile' && echo '=== Starting Expo Web ===' && npx expo start --web"
end tell
EOF

echo ""
echo "✅ Launched backend (http://localhost:3000) and Expo (http://localhost:8081)"
echo "   Both are starting in separate Terminal windows."
echo "   Wait ~10 seconds, then open: http://localhost:8081"
