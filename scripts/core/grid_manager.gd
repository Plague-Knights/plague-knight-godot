## Grid Manager - renders the town grid and manages tile state
## Draws tiles using draw_* calls (no tileset asset needed)
class_name GridManager
extends Node2D

const COLORS := {
	"empty": Color(0.06, 0.07, 0.1),
	"road": Color(0.18, 0.16, 0.14),
	"road_highlight": Color(0.22, 0.20, 0.18),
	"building": Color(0.25, 0.15, 0.12),
	"building_infected": Color(0.12, 0.3, 0.08),
	"door": Color(0.35, 0.22, 0.15),
	"trap": Color(0.18, 0.16, 0.14),  # hidden, looks like road
	"trap_revealed": Color(0.5, 0.2, 0.15),
	"hand_cart": Color(0.4, 0.35, 0.15),
	"virus": Color(0.15, 0.45, 0.15),
	"pill": Color(0.4, 0.15, 0.4),
	"horse_cart": Color(0.3, 0.25, 0.15),
	"grid_line": Color(0.12, 0.12, 0.18, 0.3),
}

var generator: TownGenerator
var game_state: GameState
var entities: Array[EntityBase] = []
var revealed_traps: Dictionary = {}  # Vector2i -> bool

func _ready() -> void:
	generator = TownGenerator.new()

func generate_town(town_num: int) -> void:
	generator.generate(town_num)
	entities.clear()
	revealed_traps.clear()
	queue_redraw()

func _draw() -> void:
	if not generator or generator.grid.size() == 0:
		return

	var tile := GameData.TILE_SIZE

	# Draw tiles
	for y in GameData.GRID_SIZE:
		for x in GameData.GRID_SIZE:
			var rect := Rect2(x * tile, y * tile, tile, tile)
			var cell: int = generator.grid[y][x]
			var color: Color

			match cell:
				TownGenerator.Tile.EMPTY:
					color = COLORS.empty
				TownGenerator.Tile.ROAD:
					color = COLORS.road
				TownGenerator.Tile.BUILDING:
					# Check if infected
					var infected := _is_building_infected(x, y)
					color = COLORS.building_infected if infected else COLORS.building
				TownGenerator.Tile.DOOR:
					color = COLORS.door
				_:
					color = COLORS.empty

			draw_rect(rect, color)

			# Grid lines
			draw_rect(rect, COLORS.grid_line, false, 1.0)

	# Draw items
	for item in generator.item_spawns:
		var ix: int = item.x
		var iy: int = item.y
		var center := Vector2(ix * tile + tile / 2.0, iy * tile + tile / 2.0)
		var itype: String = item.type

		match itype:
			"trap":
				if revealed_traps.has(Vector2i(ix, iy)):
					draw_circle(center, tile * 0.2, COLORS.trap_revealed)
			"hand_cart":
				draw_circle(center, tile * 0.25, COLORS.hand_cart)
				# Cart icon (small rect)
				draw_rect(Rect2(center - Vector2(8, 6), Vector2(16, 12)), COLORS.hand_cart.lightened(0.2))
			"virus":
				draw_circle(center, tile * 0.3, COLORS.virus)
				# Glow
				draw_circle(center, tile * 0.35, Color(0.15, 0.45, 0.15, 0.3))
			"pill":
				draw_circle(center, tile * 0.15, COLORS.pill)
			"horse_cart":
				draw_circle(center, tile * 0.3, COLORS.horse_cart)
				# Arrow indicator
				var arrow_size := 6.0
				draw_line(center - Vector2(arrow_size, 0), center + Vector2(arrow_size, 0), Color.WHITE, 2.0)
				draw_line(center + Vector2(arrow_size, 0), center + Vector2(arrow_size - 4, -4), Color.WHITE, 2.0)
				draw_line(center + Vector2(arrow_size, 0), center + Vector2(arrow_size - 4, 4), Color.WHITE, 2.0)

func is_walkable(pos: Vector2i) -> bool:
	if pos.x < 0 or pos.x >= GameData.GRID_SIZE or pos.y < 0 or pos.y >= GameData.GRID_SIZE:
		return false
	var cell: int = generator.grid[pos.y][pos.x]
	return cell == TownGenerator.Tile.ROAD or cell == TownGenerator.Tile.DOOR

func get_entity_at(pos: Vector2i) -> EntityBase:
	for entity in entities:
		if entity.grid_pos == pos:
			return entity
	return null

func get_item_at(pos: Vector2i) -> Dictionary:
	for i in generator.item_spawns.size():
		var item: Dictionary = generator.item_spawns[i]
		if item.x == pos.x and item.y == pos.y:
			return item
	return {}

func remove_item_at(pos: Vector2i) -> void:
	for i in range(generator.item_spawns.size() - 1, -1, -1):
		var item: Dictionary = generator.item_spawns[i]
		if item.x == pos.x and item.y == pos.y:
			generator.item_spawns.remove_at(i)
			queue_redraw()
			break

func reveal_trap(pos: Vector2i) -> void:
	revealed_traps[pos] = true
	queue_redraw()

func infect_building(x: int, y: int) -> void:
	for bdata in generator.building_data:
		if x >= bdata.x and x < bdata.x + bdata.w and y >= bdata.y and y < bdata.y + bdata.h:
			bdata.infected = true
			queue_redraw()
			break

func _is_building_infected(x: int, y: int) -> bool:
	for bdata in generator.building_data:
		if x >= bdata.x and x < bdata.x + bdata.w and y >= bdata.y and y < bdata.y + bdata.h:
			return bdata.get("infected", false)
	return false

func get_player_start() -> Vector2i:
	# Find nearest road to center
	var center := Vector2i(GameData.GRID_SIZE / 2, GameData.GRID_SIZE / 2)
	if is_walkable(center):
		return center
	# Search outward
	for radius in range(1, GameData.GRID_SIZE):
		for dy in range(-radius, radius + 1):
			for dx in range(-radius, radius + 1):
				var pos := center + Vector2i(dx, dy)
				if is_walkable(pos):
					return pos
	return center
