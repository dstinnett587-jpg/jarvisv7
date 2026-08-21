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
POLL_SECONDS = float(os.environ.get("J_POLL_SECONDS", "0.75"))
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

APPROVAL_ACTIONS = {"type_text", "run_shortcut", "quit_app", "click_xy", "scroll"}

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
        headers={
            "User-Agent": "JMacAgent/1.3",
            "Cache-Control": "no-cache, no-store, max-age=0",
            "Pragma": "no-cache",
        },
    )
    with urllib.request.urlopen(req, timeout=8) as r:
        return json.loads(r.read().decode("utf-8"))


def osascript(script: str):
    return subprocess.run(["/usr/bin/osascript", "-e", script], check=False, capture_output=True, text=True)


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
    safe = url.replace("\\", "\\\\").replace('"', '\\"')
    p = osascript(f'open location "{safe}"')
    if p.returncode == 0:
        log(f"open_url via AppleScript: {url}")
        return
    p2 = subprocess.run(["/usr/bin/open", url], check=False, capture_output=True, text=True)
    if p2.returncode != 0:
        detail = (p2.stderr or p.stderr or "unknown open error").strip()
        raise RuntimeError(f"Opening URL failed: {detail}")
    log(f"open_url via /usr/bin/open: {url}")


def open_app(name: str):
    if name not in SAFE_APPS:
        raise ValueError(f"App not in allowlist: {name}")
    p = subprocess.run(["/usr/bin/open", "-a", name], check=False, capture_output=True, text=True)
    if p.returncode != 0:
        raise RuntimeError((p.stderr or f"Could not open {name}").strip())


def focus_app(name: str):
    if name not in SAFE_APPS:
        raise ValueError(f"App not in allowlist: {name}")
    safe = name.replace('"', '\\"')
    osascript(f'tell application "{safe}" to activate')


def system_keystroke(key: str, modifiers=None):
    modifiers = modifiers or []
    allowed_keys = {"[", "]", "r", "l", "f", "space", "escape", "return", "tab"}
    if key not in allowed_keys:
        raise ValueError("Key is not in J's safe key allowlist")
    allowed_mods = {"command down", "option down", "control down", "shift down"}
    if any(m not in allowed_mods for m in modifiers):
        raise ValueError("Unsupported keyboard modifier")
    if key == "space":
        script = 'tell application "System Events" to key code 49'
    elif key == "escape":
        script = 'tell application "System Events" to key code 53'
    elif key == "return":
        script = 'tell application "System Events" to key code 36'
    elif key == "tab":
        script = 'tell application "System Events" to key code 48'
    else:
        using = " using {" + ", ".join(modifiers) + "}" if modifiers else ""
        script = f'tell application "System Events" to keystroke "{key}"{using}'
    p = osascript(script)
    if p.returncode != 0:
        raise RuntimeError("Keyboard control failed. Grant Accessibility permission to J Mac Agent.")


def browser_action(action: str):
    mapping = {
        "browser_back": ("[", ["command down"]),
        "browser_forward": ("]", ["command down"]),
        "browser_reload": ("r", ["command down"]),
        "browser_address": ("l", ["command down"]),
        "browser_find": ("f", ["command down"]),
        "media_play_pause": ("space", []),
        "escape": ("escape", []),
    }
    if action not in mapping:
        raise ValueError(f"Unsupported browser action: {action}")
    key, mods = mapping[action]
    system_keystroke(key, mods)


def type_text(text: str):
    if len(text) > 2000:
        raise ValueError("Text too long")
    if not approve(f"J wants to type this text into the active app:\n\n{text[:500]}"):
        raise PermissionError("User denied typing action")
    safe = text.replace("\\", "\\\\").replace('"', '\\"')
    p = osascript(f'tell application "System Events" to keystroke "{safe}"')
    if p.returncode != 0:
        raise RuntimeError("Typing failed. Grant Accessibility permission to J Mac Agent.")


def click_xy(x, y, reason=""):
    x = int(x); y = int(y)
    if not (0 <= x <= 10000 and 0 <= y <= 10000):
        raise ValueError("Click coordinates out of range")
    why = f"\n\nReason: {reason[:240]}" if reason else ""
    if not approve(f"J wants to click your screen at ({x}, {y}).{why}"):
        raise PermissionError("User denied click action")
    script = f'tell application "System Events" to click at {{{x}, {y}}}'
    p = osascript(script)
    if p.returncode != 0:
        raise RuntimeError("Click failed. Grant Accessibility permission to J Mac Agent.")


def scroll(amount, reason=""):
    amount = max(-20, min(20, int(amount)))
    why = f"\n\nReason: {reason[:240]}" if reason else ""
    if not approve(f"J wants to scroll the active window by {amount}.{why}"):
        raise PermissionError("User denied scroll action")
    p = osascript(f'tell application "System Events" to scroll area 1 of process 1') if False else None
    # CGEvent-based scrolling is not available from AppleScript directly; use small arrow/page keystrokes.
    key_code = 125 if amount > 0 else 126
    for _ in range(max(1, min(abs(amount), 8))):
        r = osascript(f'tell application "System Events" to key code {key_code}')
        if r.returncode != 0:
            raise RuntimeError("Scroll failed. Grant Accessibility permission to J Mac Agent.")


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
    subprocess.run(["/usr/bin/shortcuts", "run", name], check=False)


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
    elif action in {"browser_back", "browser_forward", "browser_reload", "browser_address", "browser_find", "media_play_pause", "escape"}:
        browser_action(action)
    elif action == "type_text":
        type_text(str(p.get("text") or ""))
    elif action == "click_xy":
        click_xy(p.get("x") or 0, p.get("y") or 0, str(p.get("reason") or ""))
    elif action == "scroll":
        scroll(p.get("amount") or 1, str(p.get("reason") or ""))
    elif action == "quit_app":
        quit_app(str(p.get("app") or ""))
    elif action == "run_shortcut":
        run_shortcut(str(p.get("name") or ""))
    elif action in {"show_results", "find_leads", "scan_map", "status"}:
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
    log(f"J Mac Agent online · poll={POLL_SECONDS}s")
    notify("J · Mac Agent", "Online and waiting for commands")

    while True:
        try:
            cmd = fetch_command()
            cid = str(cmd.get("id") or "")
            if cid and cid != state.get("last_id"):
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
