# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Plague Knight: Vector** — a roguelike tactical grid-based game where the player spreads plague through procedurally generated towns. Built with **Godot 4.6** using **GDScript** exclusively. Forward Plus renderer.

## Development

No build/test/lint tooling is configured. Run the project via the Godot editor or CLI:

```bash
# Run the game (requires Godot 4.6 on PATH)
godot --path . res://scenes/main/game.tscn
```

Main scene is defined as `res://scenes/main/game.tscn` in project.godot (not yet created).

## Architecture

### Class Design
All core classes extend **RefCounted** (not Node), making them pure data/logic containers rather than scene tree participants. They will be instantiated by scene nodes or autoloads.

### Core Systems (`scripts/core/`)
- **GameData** — Static constants: grid size (12×12, 64px tiles), player stats, building definitions, entity costs, wanted thresholds, scoring/progression values. Central balance configuration.
- **GameState** — Mutable runtime state for a single run. Uses signal-emitting setters (`energy_changed`, `power_changed`, `infected_changed`, `wanted_changed`, `town_changed`, `player_died`, `turn_advanced`) for event-driven updates. Wanted level auto-recalculates when infected_points change.
- **CareerData** — Persistent cross-run progression (XP, keys, mutations, leaderboard, daily streaks). Serializes to `user://career.json`.

### Procedural Generation (`scripts/generation/`)
- **TownGenerator** — Generates 12×12 tile grids with a seeded RNG pipeline: town square → roads (biased random walk) → buildings (weighted distribution) → items → entities. All quantities scale with `town_num` for difficulty progression.

### Key Patterns
- **Signals over polling** — State changes propagate via Godot signals
- **Constants centralized in GameData** — No magic numbers in logic code
- **Difficulty scaling** — Town number drives generation parameters (building count, enemy types, item frequency)
