## Renders the 12x12 tile grid with fog of war and building type colors
extends Node2D

const TILE_COLORS := {
	TownGenerator.Tile.EMPTY:      Color(0.08, 0.08, 0.10),  # dark stone wall
	TownGenerator.Tile.ROAD:       Color(0.38, 0.32, 0.24),
	TownGenerator.Tile.DOOR:       Color(0.60, 0.50, 0.30),
	TownGenerator.Tile.INFECTED:   Color(0.22, 0.52, 0.12),
	TownGenerator.Tile.TRAP:       Color(0.38, 0.32, 0.24),  # hidden as road
	TownGenerator.Tile.HAND_CART:  Color(0.72, 0.52, 0.22),
	TownGenerator.Tile.VIRUS:      Color(0.20, 0.78, 0.28),
	TownGenerator.Tile.PILL:       Color(0.78, 0.28, 0.48),
	TownGenerator.Tile.HORSE_CART: Color(0.30, 0.48, 0.78),
}

const BUILDING_COLORS := {
	"small_house": Color(0.52, 0.38, 0.24),
	"large_house": Color(0.48, 0.32, 0.20),
	"manor":       Color(0.55, 0.22, 0.22),
	"pub":         Color(0.58, 0.48, 0.22),
	"shop":        Color(0.24, 0.44, 0.44),
}

const FOG_COLOR := Color(0.02, 0.02, 0.04)
const EXPLORED_DIM := 0.55  # darken factor for explored-but-not-visible

func _draw() -> void:
	var gm: Node2D = get_parent()
	if not gm.town_gen:
		return
	var grid: Array = gm.town_gen.grid
	var ts: int = GameData.TILE_SIZE

	for y in GameData.GRID_SIZE:
		for x in GameData.GRID_SIZE:
			var rect := Rect2(x * ts, y * ts, ts, ts)
			var is_visible: bool = gm.fog_visible[y][x]
			var is_explored: bool = gm.fog_explored[y][x]

			if not is_explored:
				draw_rect(rect, FOG_COLOR)
				continue

			var tile: int = grid[y][x]
			var color: Color

			# Building tiles use per-type color
			if tile == TownGenerator.Tile.BUILDING:
				var bidx: int = gm.town_gen.building_map[y][x]
				if bidx >= 0:
					var btype: String = gm.town_gen.building_data[bidx].type
					color = BUILDING_COLORS.get(btype, Color(0.45, 0.30, 0.18))
				else:
					color = Color(0.45, 0.30, 0.18)
			else:
				color = TILE_COLORS.get(tile, Color.BLACK)

			# Dim explored-but-not-visible tiles
			if not is_visible:
				color = color.darkened(EXPLORED_DIM)

			draw_rect(rect, color)

			# Subtle grid lines on visible tiles
			if is_visible:
				draw_rect(rect, Color(0, 0, 0, 0.12), false, 1.0)

			# Building type indicator letter (visible only)
			if is_visible and tile == TownGenerator.Tile.BUILDING:
				var bidx: int = gm.town_gen.building_map[y][x]
				if bidx >= 0:
					var btype: String = gm.town_gen.building_data[bidx].type
					var letter: String = _building_letter(btype)
					var center := Vector2(x * ts + ts * 0.5 - 4, y * ts + ts * 0.5 + 5)
					draw_string(ThemeDB.fallback_font, center, letter,
						HORIZONTAL_ALIGNMENT_CENTER, -1, 13, Color(1, 1, 1, 0.5))

			# Item icons on visible tiles
			if is_visible and tile in [TownGenerator.Tile.HAND_CART, TownGenerator.Tile.VIRUS,
					TownGenerator.Tile.PILL, TownGenerator.Tile.HORSE_CART]:
				var icon: String = _item_icon(tile)
				var center := Vector2(x * ts + ts * 0.5 - 4, y * ts + ts * 0.5 + 5)
				draw_string(ThemeDB.fallback_font, center, icon,
					HORIZONTAL_ALIGNMENT_CENTER, -1, 16, Color.WHITE)

func _building_letter(btype: String) -> String:
	match btype:
		"small_house": return "h"
		"large_house": return "H"
		"manor":       return "M"
		"pub":         return "P"
		"shop":        return "$"
	return "?"

func _item_icon(tile: int) -> String:
	match tile:
		TownGenerator.Tile.HAND_CART:  return "+"
		TownGenerator.Tile.VIRUS:      return "V"
		TownGenerator.Tile.PILL:       return "o"
		TownGenerator.Tile.HORSE_CART: return ">"
	return ""
