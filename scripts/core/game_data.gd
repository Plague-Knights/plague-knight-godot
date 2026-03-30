## Game-wide constants and configuration
## All balance values from the original Plague Knight: Vector design
class_name GameData
extends RefCounted

# Grid
const GRID_SIZE := 12
const TILE_SIZE := 64  # pixels per tile

# Player starting stats
const START_ENERGY := 15
const START_POWER := 7
const MAX_ENERGY := 15
const MAX_POWER := 99
const BASE_VISION := 4

# Movement
const MOVE_COST := 1
const ANIM_DURATION := 0.15  # seconds for movement slide
const BUMP_DURATION := 0.12  # seconds for wall bump
const CAM_LERP := 0.15

# Building infection costs and points
const BUILDINGS := {
	"small_house": { "power_cost": 2, "points": 2, "watchman_chance": 0.33, "size": Vector2i(1, 1) },
	"large_house": { "power_cost": 3, "points": 3, "watchman_chance": 0.66, "size": Vector2i(2, 1) },
	"manor":       { "power_cost": 4, "points": 4, "watchman_chance": 1.0,  "size": Vector2i(3, 1) },
	"pub":         { "power_cost": 5, "points": 6, "watchman_chance": 1.0,  "size": Vector2i(2, 2) },
	"shop":        { "power_cost": 2, "points": 2, "watchman_chance": 0.0,  "size": Vector2i(1, 1) },
}

# Entity costs
const ENTITY_COSTS := {
	"civilian":   { "power": 1, "energy": 0 },
	"watchman":   { "power": 0, "energy": 1 },
	"patrol":     { "power": 0, "energy": 1 },
	"gatekeeper": { "power": 0, "energy": 2 },
	"town_guard": { "power": 0, "energy": 3, "power_drop_min": 3, "power_drop_max": 6 },
	"night_watch":{ "power": 1, "energy": 2, "stun_turns": 2 },
	"vault_keeper":{ "power": 0, "energy": 0, "power_drop_min": 2, "power_drop_max": 5 },
}

# Wanted level thresholds (infected points per town)
const WANTED_THRESHOLDS := [3, 7, 12, 18, 25]

# Patrol AI
const PATROL_VISION := 4
const PATROL_DIRECTION_CHANGE := 0.3

# Items
const VIRUS_DURATION_MIN := 5
const VIRUS_DURATION_MAX := 8
const HAND_CART_POWER := 1
const SHOP_POWER_BONUS := 3

# Scoring
const TOWN_CLEAR_SCORE := 20
const PILL_SCORE := 5

# Keys
const STARTING_KEYS := 3
const KEY_COST_PER_RUN := 1
const MERCY_REFUND_TURNS := 5

# XP
const MAX_XP := 42000

# Daily
const STREAK_ENERGY_BONUS := 5
const STREAK_THRESHOLD := 4
const FIRST_PAID_RUN_ENERGY := 5
