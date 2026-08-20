#!/usr/bin/env python3
import json
import os
import subprocess
import sys
import time
import urllib.request
from pathlib import Path
from urllib.parse import urlparse

COMMAND_URL = os.environ.get(
    "J_COMMAND_URL",
    "https://raw.githubusercontent.com/dstinnett587-jpg/jarvisv7/feature/j-vision-screen/commands/latest.json",
)
POLL_SECONDS = float(os.environ.get("J_POLL_SECONDS", "2.5"))
STATE_DIR = Path.home() / ".j-mac-agent"
STATE_FILE = STATE_DIR / "state.json"
LOG_FILE = STATE_DIR / "agent.log"

SAFE_APPS = {
    "Safari",
    "Google Chrome",
    "Finder",
    "Maps",
    "Music",
    "Messages",
    "Notes",
    "Calendar",
    "System Settings",
}

# These actions always require a local confirmation prompt on the Mac.
APPROVAL_ACTIONS = {"type_text", "run_shortcut", "quit_app"}

# These actions are intentionally unsupported by this first agent.
BLOCKED_ACTIONS = {
    "delete_file",
    "empty_trash",
    "enter_password",
    "change_security_settings",
    "purchase",
    "send_money",
    "install_software",
    "run_shell",
}


def log(message: str) -> None:
    STATE_DIR.mkdir(parents=True, exist_ok=True)
    line = f"{time.strftime('%Y-%m-%d %H:%M:%S')} {message}\n"
    with LOG_FILE.open("a", encoding="utf-8") as f:
        f.write(line)
    print(line, end="", flush=True)


def load_state():
    try:
        return json.loads(STATE_FILE.read_text(encoding="utf-8"))
    except Exception:
        return {"last_id": ""}


def save_state(state):
    STATE_DIR.mkdir(parents=True, exist_ok=True)
    STATE_FILE.write_text(json.dumps(state), encoding="utf-8")


def fetch_command():
    req = urllib.request.Request(
        COMMAND_URL + ("&" if "?" in COMMAND_URL else "?") + f"t={int(time.time()*1000)}",
        headers={"User-Agent": "JMacAgent/1.0", "Cache-Control": "no-cache"},
    )
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.loads(r.read().decode("utf-8"))


def osascript(script: str):
    return subprocess.run(["osascript", "-e", script], check=False, capture_output=True, text=True)


def notify(title: str, message: str):
    safe_title = title.replace('"', '\\"')
    safe_message = message.replace('"', '\\"')
    osascript(f'display notification "{safe_message}" with title "{safe_title}"')


def approve(prompt: str) -> bool:
    safe = prompt.replace('"', '\\"')
    script = (
        f'display dialog "{safe}" with title "J · Approval Required" '
        'buttons {"Deny", "Approve"} default button "Approve" cancel button "Deny"'
    )
    p = osascript(script)
    return p.returncode == 0 and "Approve" in p.stdout


def open_url(url: str):
    u = urlparse(url)
    if u.scheme not in ("http", "https") or not u.netloc:
        raise ValueError("Only normal http/https URLs are allowed")
    subprocess.run(["open", url], check=False)


def open_app(name: str):
    if name not in SAFE_APPS:
        raise ValueError(f"App not in allowlist: {name}")
    subprocess.run(["open", "-a", name], check=False)


def focus_app(name: str):
    if name not in SAFE_APPS:
        raise ValueError(f"App not in allowlist: {name}")
    safe = name.replace('"', '\\"')
    osascript(f'tell application "{safe}" to activate')


def type_text(text: str):
    if len(text) > 2000:
        raise ValueError("Text too long")
    if not approve(f"J wants to type this text into the active app:\n\n{text[:500]}"):
        raise PermissionError("User denied typing action")
    safe = text.replace("\\", "\\\\").replace('"', '\\"')
    p = osascript(f'tell application "System Events" to keystroke "{safe}"')
    if p.returncode != 0:
        raise RuntimeError("Typing failed. Grant Accessibility permission to Terminal/Python running J.")


def quit_app(name: str):
    if name not in SAFE_APPS:
        raise ValueError(f"App not in allowlist: {name}")
    if not approve(f"J wants to quit {name}."):
        raise PermissionError("User denied quit action")
    safe = name.replace('"', '\\"')
    osascript(f'tell application "{safe}" to quit')


def run_shortcut(name: str):
    if not approve(f"J wants to run the macOS Shortcut: {name}"):
        raise PermissionError("User denied Shortcut")
    subprocess.run(["shortcuts", "run", name], check=False)


def handle(cmd: dict):
    action = str(cmd.get("action") or "")
    p = cmd.get("payload") or {}
    label = ((cmd.get("display") or {}).get("label") or action or "Remote task")[:140]

    if action in BLOCKED_ACTIONS:
        raise PermissionError(f"Blocked sensitive action: {action}")

    if action == "open_url":
        open_url(str(p.get("url") or ""))
    elif action == "open_app":
        open_app(str(p.get("app") or ""))
    elif action == "focus_app":
        focus_app(str(p.get("app") or ""))
    elif action == "type_text":
        type_text(str(p.get("text") or ""))
    elif action == "quit_app":
        quit_app(str(p.get("app") or ""))
    elif action == "run_shortcut":
        run_shortcut(str(p.get("name") or ""))
    elif action in {"show_results", "find_leads", "scan_map", "status"}:
        # Web-J handles these; the local agent only needs to acknowledge them.
        return
    else:
        raise ValueError(f"Unsupported Mac action: {action}")

    notify("J · Mac Agent", f"Completed: {label}")


def main():
    if sys.platform != "darwin":
        print("J Mac Agent only runs on macOS.", file=sys.stderr)
        sys.exit(1)

    STATE_DIR.mkdir(parents=True, exist_ok=True)
    state = load_state()
    log("J Mac Agent online")
    notify("J · Mac Agent", "Online and waiting for commands")

    while True:
        try:
            cmd = fetch_command()
            cid = str(cmd.get("id") or "")
            if cid and cid != state.get("last_id"):
                # Record before execution so a failing command does not loop forever.
                state["last_id"] = cid
                save_state(state)
                try:
                    log(f"command {cid}: {cmd.get('action')}")
                    handle(cmd)
                    log(f"completed {cid}")
                except Exception as e:
                    log(f"failed {cid}: {e}")
                    notify("J · Mac Agent", f"Task failed: {e}")
        except Exception as e:
            log(f"poll error: {e}")
        time.sleep(POLL_SECONDS)


if __name__ == "__main__":
    main()
