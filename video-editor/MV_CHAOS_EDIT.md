# J Video Editor Mode — MV Chaos Edit

Reference style: user's supplied short-form vertical edit.

## Goal
J turns raw clips into fast, distressed, high-energy 9:16 social edits while preserving a review-before-publish workflow.

## Default output
- 1080x1920 vertical
- 24 or 30 fps, matching source when practical
- H.264 MP4
- 10–30 second primary cut
- Also create alternate hook versions when requested

## Edit language
- Cut aggressively on motion, beat changes, or spoken emphasis
- Remove dead air and weak openings
- Use fast punch-in/punch-out zooms sparingly
- Mix clean footage with darker/high-contrast moments
- Allow subject cutouts/composites and background replacement
- Use large distressed typography for key words only
- Add brief flashes, blur, shake, grain, texture, and overlays where they strengthen a transition
- Keep effects intentionally imperfect rather than glossy/over-produced
- Maintain readable safe zones for TikTok/Reels UI

## Audio
- Preserve intelligible dialogue
- Sync major visual cuts to transients/beats when music is present
- Duck music under dialogue
- Normalize final loudness conservatively; avoid clipping

## Commands J should understand
- `edit this like MV Chaos`
- `make this a 15 second TikTok`
- `make 3 hooks from this clip`
- `remove dead parts`
- `add distressed captions`
- `make the cuts hit harder`
- `export vertical`

## Pipeline
1. Ingest source clips and optional reference clip.
2. Probe duration, resolution, frame rate, and audio.
3. Create a transcript when dialogue exists.
4. Identify candidate hooks, dead air, motion peaks, and beat/transient points.
5. Build a rough-cut edit decision list (EDL/JSON).
6. Render a review draft.
7. Apply typography/compositing/effects pass.
8. Render final social export plus optional alternates.
9. Save project metadata so J can revise from natural-language notes.

## Safety / approval
- J may edit and export automatically.
- J must not publish/post the finished video without explicit user approval.
- J must not delete original source media.

## Initial implementation target
Use FFmpeg for deterministic trim/crop/scale/audio/export operations. Add editor automation (CapCut/DaVinci/Final Cut) later for timeline-heavy compositing and motion graphics after Mac keyboard/screen-control reliability is confirmed.
