# J Mac Agent

This is the local macOS companion for J. It polls J's remote command file and performs a small allowlisted set of Mac actions.

## Current actions

- `open_url` — opens normal `http/https` links in the default browser.
- `open_app` — opens allowlisted Mac apps.
- `focus_app` — brings an allowlisted app to the front.
- `type_text` — requires a local approval dialog before typing into the active app.
- `quit_app` — requires a local approval dialog.
- `run_shortcut` — requires a local approval dialog and runs an existing macOS Shortcut.

Sensitive commands such as purchases, sending money, password entry, security changes, software installation, arbitrary shell commands, and file deletion are blocked by this first agent.

## Install

Run this in Terminal on the Mac:

```bash
/bin/zsh -c "$(curl -fsSL https://raw.githubusercontent.com/dstinnett587-jpg/jarvisv7/feature/j-vision-screen/mac-agent/install.sh)"
```

The installer creates a LaunchAgent so J starts automatically after login.

If macOS opens Privacy & Security, grant Accessibility permission when needed. Opening links does not need Accessibility; simulated typing does.

## Test command

A remote command can look like:

```json
{
  "id": "test-open-youtube-1",
  "action": "open_url",
  "payload": {"url": "https://www.youtube.com/watch?v=9ty1v5xXcJI"},
  "display": {"source": "chatgpt", "label": "Open Naruto vs Sasuke on YouTube"}
}
```

## Logs

`~/.j-mac-agent/agent.log`
