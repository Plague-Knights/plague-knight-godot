# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Plague Knight: Vector** — a roguelike tactical grid-based game where the player spreads plague through procedurally generated towns. Built with **Godot 4.6** using **GDScript** exclusively.

## Development

### Godot (Game)

```bash
# Godot CLI path
"C:/Users/altam/Downloads/Godot_v4.6.1/Godot_v4.6.1-stable_win64_console.exe"

# Validate all scripts (no window)
godot --headless --check-only --path .

# Run the game
godot --path .

# Export web build
godot --headless --export-debug "Web" --path .

# After web export, always copy bridge.js and update Next.js:
cp web/bridge.js build/web/bridge.js
cp -r build/web/* ../pk-game-web/public/game/
```

### Next.js (Web App + API) — `E:\PK\pk-game-web`

```bash
cd E:/PK/pk-game-web
pnpm dev          # Dev server (http://localhost:3000)
pnpm build        # Production build
pnpm start        # Start production server
```

**After ANY Godot change, rebuild and copy to Next.js:**
```bash
godot --headless --export-debug "Web" --path E:/PK/plague-knight-godot
cp E:/PK/plague-knight-godot/web/bridge.js E:/PK/plague-knight-godot/build/web/bridge.js
cp -r E:/PK/plague-knight-godot/build/web/* E:/PK/pk-game-web/public/game/
```

### Smart Contracts — `E:\PK\web3\game`

```bash
cd E:/PK/web3/game
pnpm run compile        # Compile Solidity
pnpm run test           # Run tests (14 tests)
pnpm run deploy:testnet # Deploy to Soneium Minato
```

## Architecture

### Godot Game (`E:\PK\plague-knight-godot`)

```
scripts/
  core/         — GameData (constants), GameState (runtime), CareerData (persistence)
  generation/   — TownGenerator (procedural 12x12 grid)
  main/         — GameManager, GridDisplay, EntityLayer
  ui/           — TitleScreen, GameOverScreen, MutationsPanel
  web3/         — Blockchain (JS bridge), AuthManager (guest/wallet mode)
scenes/
  main/         — game.tscn (gameplay)
  ui/           — title_screen.tscn (menu)
assets/
  extracted/    — 23 pixel art sprites (16x16 native, drawn at 32px)
  fonts/        — MedievalSharp gothic font
  theme/        — plague_theme.tres (dark UI theme)
web/
  bridge.js     — JavaScript bridge for wallet + API calls
```

### Next.js App (`E:\PK\pk-game-web`)

```
src/app/
  page.tsx              — Main page (header + game iframe)
  leaderboard/page.tsx  — Leaderboard page (SSR, 30s revalidate)
  api/
    health/             — Health check
    run/start/          — Burns key on-chain, returns provably fair session
    run/end/            — Verifies integrity hash, submits score on-chain
    leaderboard/        — Cached leaderboard from contract
    player/[address]/   — Player stats + key balance
src/lib/
  config.ts             — viem clients, contract addresses
  abis.ts               — Contract ABIs
  integrity.ts          — Provably fair sessions, HMAC verification
  validation.ts         — Input validation, error sanitization
public/
  game/                 — Godot web export (copied from build/web/)
  fonts/                — MedievalSharp font
```

### Smart Contracts (`E:\PK\web3\game`)

- **PlagueKeys** (UUPS Proxy) — Dual key system: free daily (non-transferable counter) + paid (ERC20, tradeable). Key purchases split to jackpot tiers.
- **PlagueJackpot** (Immutable) — 3-tier prize pool: season (30d), weekly (7d), instant loot. Separate community pot for free-key players.

### Deployed Contracts (Soneium Minato, chainId 1946)

| Contract | Address |
|---|---|
| PlagueKeys (Proxy) | `0xc359b0a6622aD6520Ee5A47a2dea496A929B7C57` |
| PlagueJackpot | `0xcDDB693CEA9424DA5024aCE130c7DFcDAB929941` |

## Key Patterns

- **Viewport:** 640x360 with `canvas_items` stretch to 1280x720. Sprites are pixel-art (nearest neighbor), text renders crisp.
- **TILE_SIZE:** 32px (2x native 16px art)
- **Fog of war:** BFS from player, buildings block vision, explored tiles dimmed
- **Signals over polling** — State changes propagate via Godot signals
- **Guest vs Wallet mode** — AuthManager abstracts both. Guest uses local state, wallet uses on-chain via API.
- **Provably fair** — API commits seed hash before run, verifies integrity hash after, reveals seed.
- **Who signs what:** Player wallet signs claimDailyKey/buyKeys. API governor signs startRun/submitScore.

## Environment Variables (Next.js `.env.local`)

```
RPC_URL=https://rpc.minato.soneium.org
GOVERNOR_PRIVATE_KEY=<deployer wallet private key>
PLAGUE_KEYS_ADDRESS=0xc359b0a6622aD6520Ee5A47a2dea496A929B7C57
PLAGUE_JACKPOT_ADDRESS=0xcDDB693CEA9424DA5024aCE130c7DFcDAB929941
HMAC_SECRET=<random 32+ char string>
```
