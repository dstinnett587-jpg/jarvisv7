# Alfred for Intel Mac

This folder contains the native macOS shell for Alfred. It targets macOS 12 Monterey and Intel x86_64 Macs.

## What this first build does

- Shows the existing face-only Alfred interface.
- Uses native macOS Speech recognition instead of browser wake-word recognition.
- Listens for the wake name `Alfred`.
- Sends questions to the existing `/api/chat` brain.
- Plays the existing Troy voice from `/api/tts` with native `AVAudioPlayer`.
- Keeps a short follow-up conversation window so you can ask another question without repeating the wake name.

## Build on the Mac

1. Install Apple's Command Line Tools if needed:
   `xcode-select --install`
2. Clone or download this same repository and check out `jarvis-repair`.
3. In Terminal, from the repository root, run:
   `chmod +x mac/build-intel.sh`
4. Build:
   `./mac/build-intel.sh`
5. Open:
   `open mac/dist/Alfred.app`
6. Approve microphone and speech-recognition permissions when macOS asks.

This build is ad-hoc signed for local testing. It is not yet notarized for public distribution.
