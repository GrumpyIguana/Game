#!/usr/bin/env python3
"""Loop Shift: a terminal puzzle game.

Rotate tiles to reconnect the entire circuit to the power source.
"""

from __future__ import annotations

import argparse
import random
from dataclasses import dataclass
from typing import Dict, List, Sequence, Tuple

# Bit flags for cardinal directions
N, E, S, W = 1, 2, 4, 8
DIRS = [N, E, S, W]
DELTAS = {N: (-1, 0), E: (0, 1), S: (1, 0), W: (0, -1)}
OPPOSITE = {N: S, E: W, S: N, W: E}

# Glyphs for tile masks; source tile gets a marker in render().
GLYPHS: Dict[int, str] = {
    0: "·",
    N: "╵",
    E: "╶",
    S: "╷",
    W: "╴",
    N | S: "│",
    E | W: "─",
    N | E: "└",
    E | S: "┌",
    S | W: "┐",
    W | N: "┘",
    N | E | S: "├",
    E | S | W: "┬",
    S | W | N: "┤",
    W | N | E: "┴",
    N | E | S | W: "┼",
}


@dataclass
class Game:
    rows: int
    cols: int
    seed: int | None = None

    def __post_init__(self) -> None:
        self.rng = random.Random(self.seed)
        self.source = (self.rows // 2, self.cols // 2)
        self.base = self._generate_base_grid()
        self.rotations = [[0 for _ in range(self.cols)] for _ in range(self.rows)]
        self._scramble(min_moves=max(8, self.rows * self.cols // 2))

    def _inside(self, r: int, c: int) -> bool:
        return 0 <= r < self.rows and 0 <= c < self.cols

    def _generate_base_grid(self) -> List[List[int]]:
        """Generate a connected wiring graph as direction bitmasks."""
        grid = [[0 for _ in range(self.cols)] for _ in range(self.rows)]
        seen = [[False for _ in range(self.cols)] for _ in range(self.rows)]

        # Randomized DFS to create a spanning tree.
        stack = [(self.source[0], self.source[1])]
        seen[self.source[0]][self.source[1]] = True

        while stack:
            r, c = stack[-1]
            candidates = []
            for d in DIRS:
                dr, dc = DELTAS[d]
                nr, nc = r + dr, c + dc
                if self._inside(nr, nc) and not seen[nr][nc]:
                    candidates.append((d, nr, nc))

            if not candidates:
                stack.pop()
                continue

            d, nr, nc = self.rng.choice(candidates)
            seen[nr][nc] = True
            grid[r][c] |= d
            grid[nr][nc] |= OPPOSITE[d]
            stack.append((nr, nc))

        # Add a few extra edges for richer loops.
        extra_edges = (self.rows * self.cols) // 3
        for _ in range(extra_edges):
            r = self.rng.randrange(self.rows)
            c = self.rng.randrange(self.cols)
            d = self.rng.choice(DIRS)
            dr, dc = DELTAS[d]
            nr, nc = r + dr, c + dc
            if not self._inside(nr, nc):
                continue
            grid[r][c] |= d
            grid[nr][nc] |= OPPOSITE[d]

        return grid

    @staticmethod
    def _rot_mask(mask: int, turns: int) -> int:
        turns %= 4
        for _ in range(turns):
            # N->E, E->S, S->W, W->N
            n = (mask & N) != 0
            e = (mask & E) != 0
            s = (mask & S) != 0
            w = (mask & W) != 0
            mask = (E if n else 0) | (S if e else 0) | (W if s else 0) | (N if w else 0)
        return mask

    def current_mask(self, r: int, c: int) -> int:
        return self._rot_mask(self.base[r][c], self.rotations[r][c])

    def _scramble(self, min_moves: int) -> None:
        attempts = 0
        while attempts < 50:
            attempts += 1
            for r in range(self.rows):
                for c in range(self.cols):
                    self.rotations[r][c] = self.rng.randrange(4)

            # Ensure puzzle isn't already solved and has enough scrambled tiles.
            moved = sum(1 for r in range(self.rows) for c in range(self.cols) if self.rotations[r][c] != 0)
            if moved < min_moves:
                continue
            if not self.is_solved():
                return

        # Last-resort deterministic scramble.
        for r in range(self.rows):
            for c in range(self.cols):
                self.rotations[r][c] = 1

    def rotate(self, r: int, c: int, clockwise: bool = True) -> None:
        self.rotations[r][c] = (self.rotations[r][c] + (1 if clockwise else -1)) % 4

    def connected_from_source(self) -> List[List[bool]]:
        """Flood-fill over matching wire connections."""
        reachable = [[False for _ in range(self.cols)] for _ in range(self.rows)]
        sr, sc = self.source
        stack = [(sr, sc)]
        reachable[sr][sc] = True

        while stack:
            r, c = stack.pop()
            cur = self.current_mask(r, c)
            for d in DIRS:
                if not (cur & d):
                    continue
                dr, dc = DELTAS[d]
                nr, nc = r + dr, c + dc
                if not self._inside(nr, nc):
                    continue
                other = self.current_mask(nr, nc)
                if not (other & OPPOSITE[d]):
                    continue
                if not reachable[nr][nc]:
                    reachable[nr][nc] = True
                    stack.append((nr, nc))

        return reachable

    def progress(self) -> Tuple[int, int]:
        reach = self.connected_from_source()
        lit = sum(1 for row in reach for v in row if v)
        return lit, self.rows * self.cols

    def is_solved(self) -> bool:
        lit, total = self.progress()
        return lit == total

    def hint(self) -> Tuple[int, int, str]:
        """Return one tile and direction that moves toward solved state."""
        best = None
        baseline = self.progress()[0]
        for r in range(self.rows):
            for c in range(self.cols):
                for clockwise, label in ((True, "cw"), (False, "ccw")):
                    self.rotate(r, c, clockwise)
                    score = self.progress()[0]
                    self.rotate(r, c, not clockwise)
                    if score > baseline:
                        return r, c, label
                    if best is None or score > best[0]:
                        best = (score, r, c, label)
        assert best is not None
        _, r, c, label = best
        return r, c, label

    def render(self) -> str:
        lines = []
        reach = self.connected_from_source()
        for r in range(self.rows):
            row = []
            for c in range(self.cols):
                mask = self.current_mask(r, c)
                glyph = GLYPHS.get(mask, "?")
                if (r, c) == self.source:
                    glyph = "⚡"
                elif reach[r][c]:
                    glyph = f"{glyph}"
                else:
                    glyph = f"{glyph}"
                row.append(glyph)
            lines.append(" ".join(row))
        return "\n".join(lines)


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Loop Shift puzzle game")
    p.add_argument("--rows", type=int, default=6, help="Board rows (4-12)")
    p.add_argument("--cols", type=int, default=8, help="Board cols (4-16)")
    p.add_argument("--seed", type=int, default=None, help="Random seed")
    p.add_argument("--self-test", action="store_true", help="Run a quick internal check")
    return p.parse_args()


def self_test() -> int:
    for s in range(20):
        g = Game(6, 8, seed=s)
        if g.is_solved():
            return 1
        # Applying inverse of stored rotations should solve.
        for r in range(g.rows):
            for c in range(g.cols):
                g.rotations[r][c] = 0
        if not g.is_solved():
            return 2
    return 0


def run_cli(rows: int, cols: int, seed: int | None) -> int:
    game = Game(rows, cols, seed=seed)
    turns = 0

    print("\n=== LOOP SHIFT ===")
    print("Rotate tiles to connect every tile to ⚡.")
    print("Commands: r c cw | r c ccw | hint | shuffle | show | quit")
    print("Coordinates are 1-indexed: e.g. '2 5 cw'\n")

    while True:
        lit, total = game.progress()
        print(game.render())
        print(f"\nConnected: {lit}/{total}   Moves: {turns}")

        if game.is_solved():
            print("\n🎉 Grid stabilized. You solved it!")
            return 0

        raw = input("> ").strip().lower()
        if not raw:
            continue
        if raw in {"q", "quit", "exit"}:
            print("Good game.")
            return 0
        if raw in {"show", "s"}:
            continue
        if raw in {"hint", "h"}:
            r, c, label = game.hint()
            print(f"Hint: try tile ({r + 1}, {c + 1}) {label}")
            continue
        if raw in {"shuffle", "x"}:
            game._scramble(min_moves=max(8, rows * cols // 2))
            turns = 0
            print("Shuffled.")
            continue

        parts = raw.split()
        if len(parts) != 3:
            print("Invalid command. Format: row col cw|ccw")
            continue

        try:
            r = int(parts[0]) - 1
            c = int(parts[1]) - 1
        except ValueError:
            print("Row and col must be numbers.")
            continue

        if not (0 <= r < rows and 0 <= c < cols):
            print("Out of bounds.")
            continue

        direction = parts[2]
        if direction not in {"cw", "ccw"}:
            print("Rotation must be 'cw' or 'ccw'.")
            continue

        game.rotate(r, c, clockwise=(direction == "cw"))
        turns += 1


def main() -> int:
    args = parse_args()
    rows = max(4, min(12, args.rows))
    cols = max(4, min(16, args.cols))

    if args.self_test:
        code = self_test()
        if code == 0:
            print("self-test passed")
        else:
            print(f"self-test failed: {code}")
        return code

    return run_cli(rows, cols, args.seed)


if __name__ == "__main__":
    raise SystemExit(main())
