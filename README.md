# Loop Shift (Terminal Puzzle Game)

A small but surprisingly tricky puzzle game you can play in your terminal.

## Goal
Rotate pipe-like tiles so every tile becomes connected to the central power source (`⚡`).

## How to run
```bash
python3 puzzle_game.py
```

Optional flags:

- `--rows 6 --cols 8` to change board size.
- `--seed 42` for reproducible board layouts.
- `--self-test` to run internal checks.

## Commands
- `r c cw` — rotate tile at row `r`, col `c` clockwise.
- `r c ccw` — rotate tile counterclockwise.
- `hint` — suggests a useful move.
- `shuffle` — reshuffles current board.
- `show` — redraw board.
- `quit` — exit.

Coordinates are **1-indexed**.

## Why it is interesting
The board starts as a guaranteed connected network, then each tile is rotated randomly. Some configurations create loops and multiple possible local improvements, so greedy moves can still paint you into short-term dead ends. The `hint` command looks for immediate connectivity improvements, which helps beginners without fully solving the puzzle for them.
