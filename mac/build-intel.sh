#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/mac/AlfredMac/App.swift"
PLIST="$ROOT/mac/AlfredMac/Info.plist"
OUT="$ROOT/mac/dist/Alfred.app"
MACOSX_DEPLOYMENT_TARGET=12.0
export MACOSX_DEPLOYMENT_TARGET

if ! command -v xcrun >/dev/null 2>&1; then
  echo "Xcode Command Line Tools are required. Run: xcode-select --install"
  exit 1
fi

rm -rf "$OUT"
mkdir -p "$OUT/Contents/MacOS" "$OUT/Contents/Resources"
cp "$PLIST" "$OUT/Contents/Info.plist"

SDK="$(xcrun --sdk macosx --show-sdk-path)"
xcrun swiftc \
  -target x86_64-apple-macos12.0 \
  -sdk "$SDK" \
  -O \
  -framework SwiftUI \
  -framework AppKit \
  -framework WebKit \
  -framework Speech \
  -framework AVFoundation \
  "$SRC" \
  -o "$OUT/Contents/MacOS/Alfred"

codesign --force --deep --sign - "$OUT" >/dev/null 2>&1 || true

echo "Built: $OUT"
echo "Open it with: open '$OUT'"
