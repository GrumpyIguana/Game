# Cube Relay (Very Basic 3D First-Person Puzzle)

This project is now a **very basic 3D first-person puzzle game** made with plain HTML/CSS/JavaScript + Three.js.

## Puzzle concept
You are in a small room with:
- 2 energy cubes,
- 2 floor pressure pads,
- a locked exit door.

Your goal: **put both cubes on the glowing pads** to unlock the door, then walk through the exit.

## Controls
- **WASD**: move
- **Mouse**: look around (pointer lock)
- **E**: pick up / drop cube
- **R**: reset puzzle

## Run locally
Because this uses ES modules, run a local server:

```bash
python3 -m http.server 8000
```

Then open:

- `http://localhost:8000`

## Notes
- This is intentionally simple and self-contained.
- No build step required.
- Three.js is loaded from a CDN.
