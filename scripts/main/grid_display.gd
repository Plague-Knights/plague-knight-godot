## Renders the 12x12 tile grid with pixel art sprites and fog of war
extends Node2D

# Tile textures
var tex_road: Texture2D
var tex_wall: Texture2D
var tex_grass: Texture2D
var tex_door: Texture2D
var tex_trap: Texture2D
var tex_handcart: Texture2D
var tex_virus: Texture2D
var tex_pill: Texture2D
var tex_horse_cart: Texture2D
var tex_town_center: Texture2D

# Building textures by type
var tex_buildings: Dictionary = {}

const FOG_COLOR := Color(0.02, 0.02, 0.04)
const EXPLORED_DIM := 0.45
const INFECTED_TINT := Color(0.2, 0.75, 0.2, 0.55)

func _ready() -> void:
	tex_road = load("res://assets/extracted/road.png")
	tex_wall = load("res://assets/extracted/wall.png")
	tex_grass = load("res://assets/extracted/grass.png")
	tex_door = load("res://assets/extracted/door.png")
	tex_trap = load("res://assets/extracted/road.png")  # hidden as road
	tex_handcart = load("res://assets/extracted/handcart.png")
	tex_virus = load("res://assets/extracted/virus.png")
	tex_pill = load("res://assets/extracted/plaguePill.png")
	tex_horse_cart = load("res://assets/extracted/horseCart.png")
	tex_town_center = load("res://assets/extracted/townCenter.png")
	tex_buildings = {
		"small_house": load("res://assets/extracted/building1.png"),
		"large_house": load("res://assets/extracted/building2.png"),
		"manor":       load("res://assets/extracted/building3.png"),
		"pub":         load("res://assets/extracted/pub.png"),
		"shop":        load("res://assets/extracted/shop.png"),
	}

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
			var tex: Texture2D = _get_tile_texture(tile, x, y, gm)

			if tex:
				if is_visible:
					draw_texture_rect(tex, rect, false)
				else:
					draw_texture_rect(tex, rect, false, Color(EXPLORED_DIM, EXPLORED_DIM, EXPLORED_DIM))
			else:
				# Fallback colored rect
				var color := Color(0.08, 0.08, 0.10)
				if not is_visible:
					color = color.darkened(EXPLORED_DIM)
				draw_rect(rect, color)

			# Infected overlay
			if tile == TownGenerator.Tile.INFECTED:
				# Draw the building texture underneath first, then green overlay
				var bidx: int = gm.town_gen.building_map[y][x]
				if bidx >= 0:
					var btype: String = gm.town_gen.building_data[bidx].type
					var btex: Texture2D = tex_buildings.get(btype)
					if btex:
						if is_visible:
							draw_texture_rect(btex, rect, false)
						else:
							draw_texture_rect(btex, rect, false, Color(EXPLORED_DIM, EXPLORED_DIM, EXPLORED_DIM))
				if is_visible:
					draw_rect(rect, INFECTED_TINT)
				else:
					draw_rect(rect, Color(0.1, 0.35, 0.1, 0.4))

func _get_tile_texture(tile: int, x: int, y: int, gm: Node2D) -> Texture2D:
	match tile:
		TownGenerator.Tile.EMPTY:
			return tex_wall
		TownGenerator.Tile.ROAD:
			# Check if this is town center area
			var cx := GameData.GRID_SIZE / 2
			var cy := GameData.GRID_SIZE / 2
			if absi(x - cx) <= 1 and absi(y - cy) <= 1:
				return tex_town_center
			return tex_road
		TownGenerator.Tile.BUILDING:
			var bidx: int = gm.town_gen.building_map[y][x]
			if bidx >= 0:
				var btype: String = gm.town_gen.building_data[bidx].type
				return tex_buildings.get(btype, tex_wall)
			return tex_wall
		TownGenerator.Tile.DOOR:
			return tex_door
		TownGenerator.Tile.INFECTED:
			return tex_grass  # base layer, overlay drawn separately
		TownGenerator.Tile.TRAP:
			return tex_trap
		TownGenerator.Tile.HAND_CART:
			return tex_handcart
		TownGenerator.Tile.VIRUS:
			return tex_virus
		TownGenerator.Tile.PILL:
			return tex_pill
		TownGenerator.Tile.HORSE_CART:
			return tex_horse_cart
	return null
