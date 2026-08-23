#!/bin/zsh
set -e

BASE="$HOME/Library/Application Support/JMacAgent"
PLIST="$HOME/Library/LaunchAgents/com.j.macagent.plist"
PREVIEW_PLIST="$HOME/Library/LaunchAgents/com.j.previewserver.plist"
PY="$BASE/j_mac_agent.py"
VIDEO="$BASE/j_video_editor.py"
PREVIEW="$BASE/j_preview_server.py"

mkdir -p "$BASE" "$HOME/Library/LaunchAgents"

curl -fsSL "https://raw.githubusercontent.com/dstinnett587-jpg/jarvisv7/feature/j-vision-screen/mac-agent/j_mac_agent.py" -o "$PY"
curl -fsSL "https://raw.githubusercontent.com/dstinnett587-jpg/jarvisv7/feature/j-vision-screen/mac-agent/j_video_editor.py" -o "$VIDEO"
curl -fsSL "https://raw.githubusercontent.com/dstinnett587-jpg/jarvisv7/feature/j-vision-screen/mac-agent/j_preview_server.py" -o "$PREVIEW"
chmod +x "$PY" "$VIDEO" "$PREVIEW"

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

cat > "$PREVIEW_PLIST" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>com.j.previewserver</string>
  <key>ProgramArguments</key><array><string>/usr/bin/python3</string><string>$PREVIEW</string></array>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>$BASE/preview-stdout.log</string>
  <key>StandardErrorPath</key><string>$BASE/preview-stderr.log</string>
</dict></plist>
PLIST

launchctl bootout "gui/$(id -u)" "$PLIST" 2>/dev/null || true
launchctl bootout "gui/$(id -u)" "$PREVIEW_PLIST" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$PLIST"
launchctl bootstrap "gui/$(id -u)" "$PREVIEW_PLIST"
launchctl enable "gui/$(id -u)/com.j.macagent"
launchctl enable "gui/$(id -u)/com.j.previewserver"

open "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility" || true

echo ""
echo "J Mac Agent installed and started."
echo "J Video Editor installed: $VIDEO"
echo "J Preview Server installed: http://127.0.0.1:8765"
echo "If macOS asks, allow Accessibility/Automation for the process that runs J."
echo "Agent files: $BASE"
echo ""
