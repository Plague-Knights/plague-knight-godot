## Procedural town generation for each level
class_name TownGenerator
extends RefCounted

enum Tile { EMPTY, ROAD, BUILDING, DOOR, INFECTED, TRAP, HAND_CART, VIRUS, PILL, HORSE_CART }

var grid: Array[Array] = []  # 2D array of Tile enum
var building_data: Array[Dictionary] = []  # { type, x, y, w, h, infected }
var entity_spawns: Array[Dictionary] = []  # { type, x, y }
var item_spawns: Array[Dictionary] = []  # { type, x, y }
var rng := RandomNumberGenerator.new()

func generate(town_num: int, seed_val: int = -1) -> void:
	if seed_val >= 0:
		rng.seed = seed_val
	else:
		rng.randomize()

	_init_grid()
	_generate_town_square(town_num)
	_generate_roads(town_num)
	_place_buildings(town_num)
	_place_items(town_num)
	_spawn_entities(town_num)

func _init_grid() -> void:
	grid.clear()
	for y in GameData.GRID_SIZE:
		var row: Array[int] = []
		row.resize(GameData.GRID_SIZE)
		row.fill(Tile.EMPTY)
		grid.append(row)

func _generate_town_square(town_num: int) -> void:
	var size := 3 if rng.randf() < 0.4 else 2
	var cx := GameData.GRID_SIZE / 2
	var cy := GameData.GRID_SIZE / 2
	for dy in size:
		for dx in size:
			var x := cx - size / 2 + dx
			var y := cy - size / 2 + dy
			if _in_bounds(x, y):
				grid[y][x] = Tile.ROAD

func _generate_roads(town_num: int) -> void:
	var center := Vector2i(GameData.GRID_SIZE / 2, GameData.GRID_SIZE / 2)
	# Roads to all 4 edges
	var targets := [
		Vector2i(center.x, 0),  # north
		Vector2i(center.x, GameData.GRID_SIZE - 1),  # south
		Vector2i(0, center.y),  # west
		Vector2i(GameData.GRID_SIZE - 1, center.y),  # east
	]
	for target in targets:
		_carve_winding_road(center, target)

	# Extra roads based on town number
	var extra := mini(1 + town_num / 2, 3)
	for i in extra:
		var edge := rng.randi_range(0, 3)
		var pos: Vector2i
		match edge:
			0: pos = Vector2i(rng.randi_range(1, GameData.GRID_SIZE - 2), 0)
			1: pos = Vector2i(rng.randi_range(1, GameData.GRID_SIZE - 2), GameData.GRID_SIZE - 1)
			2: pos = Vector2i(0, rng.randi_range(1, GameData.GRID_SIZE - 2))
			3: pos = Vector2i(GameData.GRID_SIZE - 1, rng.randi_range(1, GameData.GRID_SIZE - 2))
		_carve_winding_road(center, pos)

func _carve_winding_road(from: Vector2i, to: Vector2i) -> void:
	var pos := from
	var max_steps := 50
	while pos != to and max_steps > 0:
		max_steps -= 1
		if _in_bounds(pos.x, pos.y):
			grid[pos.y][pos.x] = Tile.ROAD
		var dx := signi(to.x - pos.x)
		var dy := signi(to.y - pos.y)
		# Biased random walk toward target
		if rng.randf() < 0.7:
			if rng.randf() < 0.5 and dx != 0:
				pos.x += dx
			elif dy != 0:
				pos.y += dy
			elif dx != 0:
				pos.x += dx
		else:
			# Random wander
			var dirs := [Vector2i(1,0), Vector2i(-1,0), Vector2i(0,1), Vector2i(0,-1)]
			pos += dirs[rng.randi_range(0, 3)]
			pos.x = clampi(pos.x, 0, GameData.GRID_SIZE - 1)
			pos.y = clampi(pos.y, 0, GameData.GRID_SIZE - 1)
	if _in_bounds(to.x, to.y):
		grid[to.y][to.x] = Tile.ROAD

func _place_buildings(town_num: int) -> void:
	building_data.clear()
	var count := clampi(4 + town_num / 2, 3, 12)
	var types := ["small_house", "large_house", "manor", "pub", "shop"]
	var weights := [0.30, 0.25, 0.15, 0.20, 0.10]

	var has_pub := false
	var has_shop := false

	for i in count:
		var btype: String
		if not has_pub and i >= count - 2:
			btype = "pub"
			has_pub = true
		elif not has_shop and i >= count - 1:
			btype = "shop"
			has_shop = true
		else:
			btype = _weighted_pick(types, weights)

		var bdata: Dictionary = GameData.BUILDINGS[btype]
		var bsize: Vector2i = bdata.size
		var placed := _try_place_building(btype, bsize)
		if placed.size() > 0:
			building_data.append(placed)
			if btype == "pub": has_pub = true
			if btype == "shop": has_shop = true

func _try_place_building(btype: String, bsize: Vector2i) -> Dictionary:
	# Try random positions adjacent to roads
	for _attempt in 30:
		var x := rng.randi_range(1, GameData.GRID_SIZE - 1 - bsize.x)
		var y := rng.randi_range(1, GameData.GRID_SIZE - 1 - bsize.y)
		if _can_place_building(x, y, bsize) and _adjacent_to_road(x, y, bsize):
			for dy in bsize.y:
				for dx in bsize.x:
					grid[y + dy][x + dx] = Tile.BUILDING
			return { "type": btype, "x": x, "y": y, "w": bsize.x, "h": bsize.y, "infected": false }
	return {}

func _can_place_building(x: int, y: int, size: Vector2i) -> bool:
	for dy in size.y:
		for dx in size.x:
			if not _in_bounds(x + dx, y + dy):
				return false
			if grid[y + dy][x + dx] != Tile.EMPTY:
				return false
	return true

func _adjacent_to_road(x: int, y: int, size: Vector2i) -> bool:
	for dy in range(-1, size.y + 1):
		for dx in range(-1, size.x + 1):
			var nx := x + dx
			var ny := y + dy
			if _in_bounds(nx, ny) and grid[ny][nx] == Tile.ROAD:
				return true
	return false

func _place_items(town_num: int) -> void:
	item_spawns.clear()
	var roads := _get_road_tiles()

	# Traps
	var trap_count := clampi(2 + int(town_num * 0.8), 1, 6)
	if town_num == 1: trap_count = mini(trap_count, 2)
	for i in trap_count:
		var pos := _random_road(roads)
		if pos.x >= 0:
			item_spawns.append({ "type": "trap", "x": pos.x, "y": pos.y })

	# Hand carts
	for i in rng.randi_range(2, 3):
		var pos := _random_road(roads)
		if pos.x >= 0:
			item_spawns.append({ "type": "hand_cart", "x": pos.x, "y": pos.y })

	# Virus pickups
	if rng.randf() < 0.4 + town_num * 0.05:
		var pos := _random_road(roads)
		if pos.x >= 0:
			item_spawns.append({ "type": "virus", "x": pos.x, "y": pos.y })

	# Pills
	for i in rng.randi_range(1, 3):
		var pos := _random_road(roads)
		if pos.x >= 0:
			item_spawns.append({ "type": "pill", "x": pos.x, "y": pos.y })

	# Horse cart (edge road)
	var edge_roads := roads.filter(func(p): return p.x == 0 or p.x == GameData.GRID_SIZE - 1 or p.y == 0 or p.y == GameData.GRID_SIZE - 1)
	if edge_roads.size() > 0:
		var pos: Vector2i = edge_roads[rng.randi_range(0, edge_roads.size() - 1)]
		item_spawns.append({ "type": "horse_cart", "x": pos.x, "y": pos.y })

func _spawn_entities(town_num: int) -> void:
	entity_spawns.clear()
	var roads := _get_road_tiles()

	# Civilians
	var civ_count := 2 + 1 + int(town_num * 0.7)
	for i in civ_count:
		var pos := _random_road(roads)
		if pos.x >= 0:
			entity_spawns.append({ "type": "civilian", "x": pos.x, "y": pos.y })

	# Watchmen (initial)
	var watch_count := 1 + int(town_num * 0.6)
	for i in watch_count:
		var pos := _random_road(roads)
		if pos.x >= 0:
			entity_spawns.append({ "type": "watchman", "x": pos.x, "y": pos.y })

	# Patrols
	var patrol_count := town_num / 2 + (1 if town_num >= 3 else 0) + (1 if town_num >= 6 else 0)
	for i in patrol_count:
		var pos := _random_road(roads)
		if pos.x >= 0:
			entity_spawns.append({ "type": "patrol", "x": pos.x, "y": pos.y })

	# Town Guard (Town 3+)
	if town_num >= 3 and rng.randf() < 0.3 + town_num * 0.12:
		var pos := _random_road(roads)
		if pos.x >= 0:
			entity_spawns.append({ "type": "town_guard", "x": pos.x, "y": pos.y })

	# Vault Keeper (Town 3+)
	if town_num >= 3 and rng.randf() < 0.3 + town_num * 0.05:
		var pos := _random_road(roads)
		if pos.x >= 0:
			entity_spawns.append({ "type": "vault_keeper", "x": pos.x, "y": pos.y })

# Helpers
func _in_bounds(x: int, y: int) -> bool:
	return x >= 0 and x < GameData.GRID_SIZE and y >= 0 and y < GameData.GRID_SIZE

func _get_road_tiles() -> Array[Vector2i]:
	var roads: Array[Vector2i] = []
	for y in GameData.GRID_SIZE:
		for x in GameData.GRID_SIZE:
			if grid[y][x] == Tile.ROAD:
				roads.append(Vector2i(x, y))
	return roads

func _random_road(roads: Array[Vector2i]) -> Vector2i:
	if roads.size() == 0:
		return Vector2i(-1, -1)
	return roads[rng.randi_range(0, roads.size() - 1)]

func _weighted_pick(items: Array, weights: Array) -> String:
	var total := 0.0
	for w in weights:
		total += w
	var roll := rng.randf() * total
	var acc := 0.0
	for i in items.size():
		acc += weights[i]
		if roll <= acc:
			return items[i]
	return items[0]
