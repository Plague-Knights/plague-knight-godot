# Plague Knight: Vector

Roguelike tactical plague-spreading game built with Godot 4.6. Spread the plague through procedurally generated towns, infect buildings, fight enemies, and compete on the leaderboard.

## Play

**Desktop:** Open in Godot 4.6 and press F5

**Web:** Export to web and serve the `build/web/` directory

## Stack

- **Engine:** Godot 4.6 (GDScript)
- **Blockchain:** Soneium Minato testnet (chainId 1946)
- **Wallet:** MetaMask via JavaScriptBridge (web export only)
- **API:** [pk-game-api](../pk-game-api) — Hono server for provably fair runs and score submission

## Architecture

```
scenes/
  main/game.tscn          — Main game scene
  ui/title_screen.tscn     — Title screen with wallet/guest mode

scripts/
  core/                    — GameData (constants), GameState (runtime), CareerData (persistence)
  generation/              — TownGenerator (procedural 12x12 grid)
  main/                    — GameManager, GridDisplay, EntityLayer
  ui/                      — TitleScreen, GameOverScreen, MutationsPanel
  web3/                    — Blockchain bridge, AuthManager

assets/
  extracted/               — 23 pixel art sprites (16x16, 4x scaled)
  fonts/                   — MedievalSharp gothic font
  theme/                   — Dark plague UI theme

web/
  bridge.js                — JS↔GDScript bridge for wallet + API calls
  serve.js                 — Static server for web export
```

## Game Flow

1. **Title Screen** — Guest mode or Connect Wallet (MetaMask)
2. **Begin Infection** — Spend a key (free or paid) to start a run
3. **Gameplay** — Move on 12x12 grid, infect buildings, fight enemies, collect items
4. **Game Over** — Score submitted on-chain (wallet mode), XP earned, stats shown
5. **Leaderboard** — Season jackpot (30d), Weekly mini jackpot (7d), Instant loot, Community pot

## Controls

- **WASD / Arrow Keys** — Move
- **Space** — Wait a turn

## Contracts

| Contract | Address | Type |
|---|---|---|
| PlagueKeys (Proxy) | `0xc359b0a6622aD6520Ee5A47a2dea496A929B7C57` | UUPS Upgradeable |
| PlagueJackpot | `0xcDDB693CEA9424DA5024aCE130c7DFcDAB929941` | Immutable |

## Web Export

```bash
# Build (requires Godot 4.6 CLI)
godot --headless --export-debug "Web" --path .
cp web/bridge.js build/web/bridge.js

# Serve locally
cd build/web && python -m http.server 3333
```

Set `window.PLAGUE_API_URL` in `bridge.js` to your deployed API URL before building.
