#!/bin/zsh
set -e

BASE="$HOME/Library/Application Support/JMacAgent"
PLIST="$HOME/Library/LaunchAgents/com.j.macagent.plist"
PY="$BASE/j_mac_agent.py"

mkdir -p "$BASE" "$HOME/Library/LaunchAgents"

curl -fsSL "https://raw.githubusercontent.com/dstinnett587-jpg/jarvisv7/feature/j-vision-screen/mac-agent/j_mac_agent.py" -o "$PY"
chmod +x "$PY"

cat > "$PLIST" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>com.j.macagent</string>
  <key>ProgramArguments</key><array><string>/usr/bin/python3</string><string>$PY</string></array>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>$BASE/stdout.log</string>
  <key>StandardErrorPath</key><string>$BASE/stderr.log</string>
</dict></plist>
PLIST

launchctl bootout "gui/$(id -u)" "$PLIST" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$PLIST"
launchctl enable "gui/$(id -u)/com.j.macagent"

open "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility" || true

echo ""
echo "J Mac Agent installed and started."
echo "If macOS asks, allow Accessibility/Automation for the process that runs J."
echo "Agent files: $BASE"
echo ""
