#!/usr/bin/env python3
import json
import shutil
import subprocess
import sys
from pathlib import Path

BASE_DIR = Path.home() / "Library" / "Application Support" / "JMacAgent"
OUTPUT_DIR = Path.home() / "Movies" / "J Edits"


def _find_binary(name: str):
    local = BASE_DIR / "bin" / name
    if local.exists() and local.is_file():
        return str(local)
    for candidate in (f"/opt/homebrew/bin/{name}", f"/usr/local/bin/{name}", name):
        p = shutil.which(candidate) if candidate == name else (candidate if Path(candidate).exists() else None)
        if p:
            return str(p)
    return None


def ffmpeg_bin():
    p = _find_binary("ffmpeg")
    if p:
        return p
    raise RuntimeError("FFmpeg is not installed. Install the J-local FFmpeg bundle, then retry.")


def ffprobe_bin():
    p = _find_binary("ffprobe")
    if p:
        return p
    raise RuntimeError("ffprobe is not installed. Install the J-local FFmpeg bundle, then retry.")


def probe(path: Path):
    cmd = [ffprobe_bin(), "-v", "error", "-show_entries", "format=duration:stream=width,height,r_frame_rate", "-of", "json", str(path)]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError((r.stderr or "ffprobe failed").strip())
    return json.loads(r.stdout)


def safe_input(raw: str):
    p = Path(raw).expanduser().resolve()
    if not p.exists() or not p.is_file():
        raise ValueError(f"Input video not found: {p}")
    if p.suffix.lower() not in {".mp4", ".mov", ".m4v", ".avi", ".mkv", ".webm"}:
        raise ValueError("Unsupported input video format")
    return p


def render_mv_chaos(input_path: str, output_name: str = "mv-chaos-edit.mp4", start: float = 0.0, duration: float = 15.0):
    src = safe_input(input_path)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    out = OUTPUT_DIR / Path(output_name).name
    duration = max(1.0, min(float(duration), 60.0))
    start = max(0.0, float(start))

    vf = (
        "scale=1080:1920:force_original_aspect_ratio=increase,"
        "crop=1080:1920,"
        "eq=contrast=1.10:saturation=1.08:brightness=-0.02,"
        "noise=alls=5:allf=t+u,"
        "zoompan=z='min(zoom+0.0006,1.04)':d=1:s=1080x1920:fps=30"
    )

    cmd = [
        ffmpeg_bin(), "-y", "-ss", f"{start:.3f}", "-i", str(src), "-t", f"{duration:.3f}",
        "-vf", vf,
        "-af", "loudnorm=I=-14:TP=-1.5:LRA=11",
        "-c:v", "libx264", "-preset", "medium", "-crf", "20",
        "-c:a", "aac", "-b:a", "192k",
        "-movflags", "+faststart",
        str(out),
    ]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError((r.stderr or "FFmpeg render failed")[-3000:])
    return {"ok": True, "output": str(out), "probe": probe(out)}


def main():
    if len(sys.argv) < 2:
        print("usage: j_video_editor.py INPUT [OUTPUT_NAME] [START] [DURATION]", file=sys.stderr)
        sys.exit(2)
    result = render_mv_chaos(
        sys.argv[1],
        sys.argv[2] if len(sys.argv) > 2 else "mv-chaos-edit.mp4",
        float(sys.argv[3]) if len(sys.argv) > 3 else 0.0,
        float(sys.argv[4]) if len(sys.argv) > 4 else 15.0,
    )
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
