# Plague Knight: Vector - Godot vs JavaScript Comparison

> Generated 2026-03-31. Compares the Godot 4.6 port (`plague-knight-godot`) against the original JavaScript implementation (`plague-knight/game.js`).

## Status Summary

| Category | JS (Original) | Godot (Port) | Parity |
|----------|:---:|:---:|:---:|
| Core Movement & Grid | Done | Done | 100% |
| Town Generation | Done | Done | 95% |
| Building Infection | Done | Done | 95% |
| Entity AI (7 types) | Done | Done | 90% |
| Combat & Interactions | Done | Done | 90% |
| Items & Pickups | Done | Done | 95% |
| Energy & Power | Done | Done | 100% |
| Turn System | Done | Done | 100% |
| Scoring & Progression | Done | Done | 90% |
| Save/Persistence | Done | Done | 80% |
| Mutation UI | Done | Done | 100% |
| Mutation Mechanics | Done | **Missing** | 0% |
| Upgrade System (15 cards) | Done | **Missing** | 0% |
| Quest System (5 quests) | Done | **Missing** | 0% |
| Leaderboard | Done | Partial | 30% |
| Web3/Wallet | Done | Done | 90% |
| Key System (dual mode) | Done | Done | 90% |
| Provably Fair Runs | Done | Done | 95% |
| Daily Systems | Done | Partial | 50% |
| HUD | Done | Done | 85% |
| Game Over Screen | Done | Done | 90% |
| Title Screen | Done | Done | 85% |
| Touch Controls | Done | Done | 90% |
| Minimap | Done | **Missing** | 0% |
| Floating Numbers/VFX | Done | **Missing** | 0% |
| Screen Shake | Done | **Missing** | 0% |
| Tile Tooltips | Done | **Missing** | 0% |
| Tutorial Overlay | Done | **Missing** | 0% |
| Integrity Anti-Cheat | Done | **Missing** | 0% |
| Nickname System | Done | **Missing** | 0% |

---

## CRITICAL MISSING FEATURES (Gameplay Impact)

### 1. Upgrade System (Post-Town Rewards)
**JS:** After clearing each town, player is offered 3 random upgrade cards from a pool of 15 (5 common, 5 rare, 5 epic). Weighted rarity roll: 30% common, 40% rare, 30% epic. These modify the current run permanently.

**Godot:** Not implemented at all. No upgrade cards, no post-town selection screen, no run modifiers.

**Upgrades missing:**
| Rarity | Name | Effect |
|--------|------|--------|
| Common | Thick Cloak | +2 max energy |
| Common | Herb Pouch | +1 starting power |
| Common | Leather Boots | 20% move cost reduction |
| Common | Plague Salve | +3 energy immediately |
| Common | Rat Familiar | +1 vision range |
| Rare | Miasma Vial | Infect costs -1 power (min -2) |
| Rare | Shadow Step | 25% chance free move |
| Rare | Iron Mask | Watchmen drain -1 energy |
| Rare | Plague Doctor | +5 max energy |
| Rare | Dark Tonic | Hand carts give +1 extra power |
| Epic | Black Death | All infect +2 points |
| Epic | Carrion Crown | Town bonus +5 energy |
| Epic | Wraith Cloak | Enemies 30% miss chance |
| Epic | Pandemic | Virus pickup lasts +3 turns |
| Epic | Soul Harvest | Kill enemies for +1 pill |

### 2. Mutation Mechanics (Talent Tree Effects)
**JS:** All 15 mutations have working gameplay effects. The mutation tree UI lets you spend XP to unlock, and effects are applied at run start.

**Godot:** Mutation UI panel is fully built and styled, but the actual gameplay effects are never applied. `GameState.active_mutations` array exists but is never read by any game logic.

**Missing mutation effects:**
- Infection Chains I/II (20-40% auto-spread to nearby buildings)
- Plague Carrier (10% power refund on kills)
- Resilient Strain I/II (10-20% dodge chance on enemy encounters)
- Energy Reserve I (+5 max energy)
- Swift Plague I/II (5-10 free moves per town)
- Pathfinder's Eye (+1 vision range)
- Opportunist I/II (shops give +1/+2 extra power)
- Pill Collector (20% more pill drops)
- Wanted Management I (20% slower wanted escalation)
- Hunter's Mark (15% more town guard spawns)
- Infection Multiplier I (+1% points per 50 infected)

### 3. Quest System
**JS:** 5 career quests with cumulative progress tracking, key rewards, and claim buttons.

| Quest | Target | Reward |
|-------|--------|--------|
| Infect 50 buildings total | Cumulative | +1 key |
| Defeat 10 enemies total | Cumulative | +1 key |
| Reach Town 5 in a single run | Per-run | +2 keys |
| Collect 20 pills total | Cumulative | +1 key |
| Complete 10 runs | Cumulative | +2 keys |

**Godot:** `CareerData` has a `claimed_quests` array but no quest definitions, progress tracking, quest UI modal, or claim mechanics exist.

---

## MISSING UI/UX FEATURES

### 4. Minimap
**JS:** 48x48px real-time minimap showing explored tiles (4px per tile). Always visible during gameplay.

**Godot:** Not implemented. No minimap rendering.

### 5. Floating Damage/Gain Numbers
**JS:** Animated floating text above player/entities showing resource changes: red for energy loss, green for infection gains, yellow/gold for power gains. Floats upward and fades out.

**Godot:** Not implemented. Resource changes are only visible in the HUD.

### 6. Screen Shake
**JS:** Camera shake effect on energy damage (trap hits, hard enemy encounters).

**Godot:** Not implemented. No camera shake feedback.

### 7. Tile Tooltips
**JS:** Hover/tap tooltips showing tile descriptions (building type, item type, terrain info).

**Godot:** Not implemented. No hover information system.

### 8. Tutorial Overlay
**JS:** First-time player tutorial overlay shown on first run. Dismissible on click. Tracked in localStorage so it only shows once.

**Godot:** Not implemented. No onboarding flow.

### 9. Plague Particle Effects
**JS:** 15 ambient green particles drifting upward during gameplay. Visual atmosphere.

**Godot:** Not implemented. No ambient particle effects.

### 10. Nickname System
**JS:** Players can set a 3-15 character nickname. Shown in HUD, leaderboard, and game over screen. Edit modal available.

**Godot:** Not implemented. No nickname input or display.

---

## PARTIALLY IMPLEMENTED FEATURES

### 11. Leaderboard
**JS:** Full local top-10 leaderboard with name, score, infected, towns, pills, date, free-run flag. Auto-submit for signed-in players. Medal styling for top 3.

**Godot:** Title screen has leaderboard panel UI, but shows placeholder "(No scores yet)". No score storage, no submission, no medal styling.

### 12. Daily Systems
**JS:** Daily free key claim (ISO date check), daily streak counter (resets on missed day), first-paid-run daily bonus (+5 max energy), streak bonus (4th+ run = +5 energy).

**Godot:** Has `daily_free_key_claimed` flag and `daily_streak` in CareerData. Daily key claim works. But streak bonuses and first-paid-run daily bonus are not applied to gameplay.

### 13. Wanted Level Escalation
**JS:** Starting wanted level increases in later towns (Town 6+: +1 star, Town 11+: +2 stars). Night Watch spawns at 3+ stars.

**Godot:** Wanted thresholds exist and display works. But starting-wanted escalation for later towns is not implemented. Night Watch entity is defined in GameData but never spawned by TownGenerator.

### 14. Save Integrity
**JS:** SHA-like hash (`PlagueKnight_v1_s4lt`) detects casual save file tampering. Resets all stats if mismatch.

**Godot:** No integrity checking on save file (`career.json`).

### 15. Key Conversion
**JS:** Players can convert 500 lifetime infected points into 1 key.

**Godot:** Not implemented. No conversion mechanism.

---

## FEATURES GODOT HAS THAT JS DOESN'T

| Feature | Notes |
|---------|-------|
| Web build with Docker deploy | `web/Dockerfile` + `web/serve.js` |
| Custom HTML shell | `web/custom_shell.html` with styled loader |
| JavaScript bridge for Web3 | `web/bridge.js` with full PlagueWeb3 API |
| Touch auto-detection | Proper mobile/desktop detection |
| Godot theme system | `plague_theme.tres` with consistent dark styling |
| MedievalSharp font | Gothic serif font properly loaded |

---

## PRIORITY IMPLEMENTATION ORDER

### P0 - Core Gameplay Gap (blocks fun factor)
1. **Upgrade System** - The post-town card selection is a major roguelike loop. Without it, town progression feels flat.
2. **Mutation Mechanics** - UI is done, just wire the effects into GameState/GameController.

### P1 - Progression & Retention
3. **Quest System** - 5 quests with key rewards. Gives players goals.
4. **Floating Numbers** - Critical juice/feedback. Players need to see +power, -energy visually.
5. **Screen Shake** - Important game feel on damage.

### P2 - Polish & Completeness
6. **Minimap** - Quality of life for navigation.
7. **Night Watch spawning** - Entity exists but never appears in game.
8. **Wanted escalation** - Starting wanted in later towns.
9. **Leaderboard storage** - Save and display top scores.
10. **Tutorial** - First-time player onboarding.

### P3 - Nice to Have
11. Tile tooltips
12. Plague particle effects
13. Nickname system
14. Key conversion (500 infected = 1 key)
15. Save integrity checking
16. Daily streak bonuses
