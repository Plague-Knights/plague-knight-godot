## Main game controller - orchestrates turns, input, and game logic
extends Node2D

var game_state: GameState
var career_data: CareerData
var town_gen: TownGenerator
var entities: Array = []  # { type, x, y, stunned? }
var game_over := false
var auth: AuthManager = null
var game_over_screen: Control = null

# Fog of war
var fog_visible: Array = []   # 2D bool - currently in line of sight
var fog_explored: Array = []  # 2D bool - seen at least once this town

@onready var grid_display: Node2D = $GridDisplay
@onready var entity_layer: Node2D = $EntityLayer
@onready var camera: Camera2D = $Camera2D
@onready var energy_label: Label = $HUD/TopPanel/TopBar/EnergyLabel
@onready var power_label: Label = $HUD/TopPanel/TopBar/PowerLabel
@onready var wanted_label: Label = $HUD/TopPanel/TopBar/WantedLabel
@onready var town_label: Label = $HUD/TopPanel/TopBar/TownLabel
@onready var turn_label: Label = $HUD/TopPanel/TopBar/TurnLabel
@onready var score_label: Label = $HUD/TopPanel/TopBar/ScoreLabel
@onready var message_label: Label = $HUD/BottomPanel/MessageLabel

func _ready() -> void:
	career_data = CareerData.new()
	career_data.load_save()
	career_data.check_daily_reset()
	# Get auth from title screen if available
	if has_meta("auth_manager"):
		auth = get_meta("auth_manager")
	# Connect touch controls signals
	var touch := $TouchControls
	if touch:
		touch.direction_pressed.connect(_on_touch_direction)
		touch.wait_pressed.connect(_on_touch_wait)
	_start_run()

func _start_run() -> void:
	game_over = false
	game_state = GameState.new()
	game_state.player_died.connect(_on_player_died)
	_generate_town()
	_update_hud()

func _generate_town() -> void:
	town_gen = TownGenerator.new()
	town_gen.generate(game_state.town_num)
	entities.clear()
	for e in town_gen.entity_spawns:
		entities.append(e.duplicate())
	# Stamp items onto grid
	for item in town_gen.item_spawns:
		var tile: int = {
			"trap": TownGenerator.Tile.TRAP,
			"hand_cart": TownGenerator.Tile.HAND_CART,
			"virus": TownGenerator.Tile.VIRUS,
			"pill": TownGenerator.Tile.PILL,
			"horse_cart": TownGenerator.Tile.HORSE_CART,
		}.get(item.type, -1)
		if tile >= 0:
			town_gen.grid[item.y][item.x] = tile
	# Spawn player at town square center
	game_state.player_pos = Vector2i(GameData.GRID_SIZE / 2, GameData.GRID_SIZE / 2)
	_init_fog()
	_update_visibility()

# --- Fog of War ---

func _init_fog() -> void:
	fog_visible = []
	fog_explored = []
	for y in GameData.GRID_SIZE:
		var vrow: Array = []
		var erow: Array = []
		vrow.resize(GameData.GRID_SIZE)
		erow.resize(GameData.GRID_SIZE)
		vrow.fill(false)
		erow.fill(false)
		fog_visible.append(vrow)
		fog_explored.append(erow)

func _update_visibility() -> void:
	# Clear current visibility
	for y in GameData.GRID_SIZE:
		for x in GameData.GRID_SIZE:
			fog_visible[y][x] = false
	# BFS from player, limited by vision range. Buildings block sight.
	var start: Vector2i = game_state.player_pos
	var queue: Array[Vector2i] = [start]
	var dist_map: Dictionary = {}
	dist_map[start] = 0
	fog_visible[start.y][start.x] = true
	fog_explored[start.y][start.x] = true
	while queue.size() > 0:
		var pos: Vector2i = queue.pop_front()
		var d: int = dist_map[pos]
		if d >= game_state.vision:
			continue
		var _fow_dirs: Array[Vector2i] = [Vector2i(1,0), Vector2i(-1,0), Vector2i(0,1), Vector2i(0,-1), Vector2i(1,1), Vector2i(1,-1), Vector2i(-1,1), Vector2i(-1,-1)]
		for dir: Vector2i in _fow_dirs:
			var next: Vector2i = pos + dir
			if not _in_bounds(next) or dist_map.has(next):
				continue
			dist_map[next] = d + 1
			fog_visible[next.y][next.x] = true
			fog_explored[next.y][next.x] = true
			# Buildings/infected block vision beyond them
			var tile: int = town_gen.grid[next.y][next.x]
			if tile != TownGenerator.Tile.BUILDING and tile != TownGenerator.Tile.INFECTED:
				queue.append(next)
	_refresh_display()

func _refresh_display() -> void:
	grid_display.queue_redraw()
	entity_layer.queue_redraw()

# --- Input ---

func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("toggle_fullscreen"):
		_toggle_fullscreen()
		return
	if game_over:
		return
	var dir := Vector2i.ZERO
	if event.is_action_pressed("move_up"):    dir = Vector2i(0, -1)
	elif event.is_action_pressed("move_down"):  dir = Vector2i(0, 1)
	elif event.is_action_pressed("move_left"):  dir = Vector2i(-1, 0)
	elif event.is_action_pressed("move_right"): dir = Vector2i(1, 0)
	elif event.is_action_pressed("wait_turn"):
		_process_turn()
		return
	if dir != Vector2i.ZERO:
		_try_move(dir)

func _on_touch_direction(dir: Vector2i) -> void:
	if game_over:
		return
	_try_move(dir)

func _on_touch_wait() -> void:
	if game_over:
		return
	_process_turn()

func _try_move(dir: Vector2i) -> void:
	var target := game_state.player_pos + dir
	if not _in_bounds(target):
		return

	# Entity collision
	var eidx := _entity_at(target)
	if eidx >= 0:
		_interact_entity(eidx)
		_process_turn()
		return

	var tile: int = town_gen.grid[target.y][target.x]

	# Bump-to-infect buildings
	if tile == TownGenerator.Tile.BUILDING:
		_try_infect_building(target)
		_process_turn()
		return

	# Can't walk on infected buildings or empty
	if tile == TownGenerator.Tile.INFECTED or tile == TownGenerator.Tile.EMPTY:
		return

	# Movement cost
	if not game_state.can_move_free():
		game_state.energy -= GameData.MOVE_COST
	elif game_state.free_moves_remaining > 0:
		game_state.free_moves_remaining -= 1

	game_state.player_pos = target
	game_state.total_moves += 1
	_check_pickup(target)
	_process_turn()

# --- Items ---

func _check_pickup(pos: Vector2i) -> void:
	var tile: int = town_gen.grid[pos.y][pos.x]
	match tile:
		TownGenerator.Tile.HAND_CART:
			game_state.power += GameData.HAND_CART_POWER
			town_gen.grid[pos.y][pos.x] = TownGenerator.Tile.ROAD
			_show_message("+%d Power" % GameData.HAND_CART_POWER)
		TownGenerator.Tile.VIRUS:
			game_state.virus_turns_remaining = town_gen.rng.randi_range(
				GameData.VIRUS_DURATION_MIN, GameData.VIRUS_DURATION_MAX)
			town_gen.grid[pos.y][pos.x] = TownGenerator.Tile.ROAD
			_show_message("Virus active! %d free turns" % game_state.virus_turns_remaining)
		TownGenerator.Tile.PILL:
			game_state.pills_collected += 1
			town_gen.grid[pos.y][pos.x] = TownGenerator.Tile.ROAD
			_show_message("Pill collected!")
		TownGenerator.Tile.TRAP:
			game_state.energy -= 2
			town_gen.grid[pos.y][pos.x] = TownGenerator.Tile.ROAD
			_show_message("Trap! -2 Energy")
		TownGenerator.Tile.HORSE_CART:
			_advance_town()

# --- Infection ---

func _try_infect_building(target: Vector2i) -> void:
	for bdata in town_gen.building_data:
		if bdata.infected:
			continue
		if target.x < bdata.x or target.x >= bdata.x + bdata.w:
			continue
		if target.y < bdata.y or target.y >= bdata.y + bdata.h:
			continue
		var btype_data: Dictionary = GameData.BUILDINGS[bdata.type]
		if game_state.power < btype_data.power_cost:
			_show_message("Not enough power!")
			return
		# Infect the building
		game_state.power -= btype_data.power_cost
		game_state.infected_points += btype_data.points
		game_state.buildings_infected += 1
		bdata.infected = true
		for dy in bdata.h:
			for dx in bdata.w:
				town_gen.grid[bdata.y + dy][bdata.x + dx] = TownGenerator.Tile.INFECTED
		if bdata.type == "shop":
			game_state.power += GameData.SHOP_POWER_BONUS
			_show_message("Shop infected! +%d Power" % GameData.SHOP_POWER_BONUS)
		else:
			_show_message("%s infected! +%d pts" % [
				bdata.type.replace("_", " ").capitalize(), btype_data.points])
		# Watchman spawn
		if town_gen.rng.randf() < btype_data.watchman_chance:
			_spawn_enemy("watchman", game_state.player_pos)
		if bdata.type == "pub":
			_spawn_enemy("gatekeeper", game_state.player_pos)
		return

# --- Entity interaction ---

func _interact_entity(idx: int) -> void:
	var entity: Dictionary = entities[idx]
	if entity.get("stunned", 0) > 0:
		return
	var etype: String = entity.type
	var cost: Dictionary = GameData.ENTITY_COSTS[etype]
	match etype:
		"civilian":
			if game_state.power >= cost.power:
				game_state.power -= cost.power
				game_state.pills_collected += 1
				entities.remove_at(idx)
				_show_message("Civilian infected! Got pill")
			else:
				_show_message("Not enough power!")
		"night_watch":
			game_state.energy -= cost.energy
			entity["stunned"] = GameData.ENTITY_COSTS["night_watch"].stun_turns
			_show_message("Night Watch stunned!")
		"town_guard":
			game_state.energy -= cost.energy
			var drop := town_gen.rng.randi_range(cost.power_drop_min, cost.power_drop_max)
			game_state.power += drop
			game_state.enemies_defeated += 1
			game_state.town_guards_killed += 1
			entities.remove_at(idx)
			_show_message("Town Guard defeated! +%d Power" % drop)
		"vault_keeper":
			var drop := town_gen.rng.randi_range(cost.power_drop_min, cost.power_drop_max)
			game_state.power += drop
			game_state.enemies_defeated += 1
			entities.remove_at(idx)
			_show_message("Vault Keeper caught! +%d Power" % drop)
		_:  # watchman, patrol, gatekeeper
			game_state.energy -= cost.energy
			game_state.enemies_defeated += 1
			entities.remove_at(idx)
			_show_message("%s defeated!" % etype.replace("_", " ").capitalize())

# --- Turn processing ---

func _process_turn() -> void:
	game_state.advance_turn()
	_process_entities()
	_update_visibility()
	_update_hud()
	_refresh_display()

func _process_entities() -> void:
	for i in entities.size():
		var entity: Dictionary = entities[i]
		if entity.get("stunned", 0) > 0:
			entity["stunned"] -= 1
			continue
		match entity.type:
			"patrol", "night_watch", "town_guard":
				_ai_chase(entity)
			"vault_keeper":
				_ai_flee(entity)
			"watchman":
				_ai_watchman(entity)
			"gatekeeper":
				_ai_chase(entity)  # gatekeepers always chase
			"civilian":
				_ai_civilian(entity)

func _ai_chase(entity: Dictionary) -> void:
	var epos := Vector2i(entity.x, entity.y)
	var ppos := game_state.player_pos
	var dist := absi(ppos.x - epos.x) + absi(ppos.y - epos.y)
	if dist <= GameData.PATROL_VISION:
		var dir := _step_toward(epos, ppos)
		var target := epos + dir
		if _in_bounds(target) and _is_walkable(target) and _entity_at(target) < 0:
			entity.x = target.x
			entity.y = target.y
			if Vector2i(entity.x, entity.y) == ppos:
				var cost: Dictionary = GameData.ENTITY_COSTS[entity.type]
				game_state.energy -= cost.energy
				_show_message("%s attacks! -%d Energy" % [
					entity.type.replace("_", " ").capitalize(), cost.energy])
	elif town_gen.rng.randf() < GameData.PATROL_DIRECTION_CHANGE:
		var dirs := [Vector2i(1,0), Vector2i(-1,0), Vector2i(0,1), Vector2i(0,-1)]
		var dir: Vector2i = dirs[town_gen.rng.randi_range(0, 3)]
		var target := epos + dir
		if _in_bounds(target) and _is_walkable(target):
			entity.x = target.x
			entity.y = target.y

func _ai_watchman(entity: Dictionary) -> void:
	var epos := Vector2i(entity.x, entity.y)
	var ppos := game_state.player_pos
	var dist := absi(ppos.x - epos.x) + absi(ppos.y - epos.y)
	# Town 1-2: watchmen are static sentries
	# Town 3+: watchmen patrol and chase within 3 tiles
	# Town 5+: watchmen chase within 5 tiles
	if game_state.town_num < 3:
		return
	var vision := 3 if game_state.town_num < 5 else 5
	if dist <= vision:
		# Chase player
		var dir := _step_toward(epos, ppos)
		var target := epos + dir
		if _in_bounds(target) and _is_walkable(target) and _entity_at(target) < 0:
			entity.x = target.x
			entity.y = target.y
			if Vector2i(entity.x, entity.y) == ppos:
				var cost: Dictionary = GameData.ENTITY_COSTS["watchman"]
				game_state.energy -= cost.energy
				_show_message("Watchman attacks! -%d Energy" % cost.energy)
	elif town_gen.rng.randf() < 0.2:
		# Slow random patrol
		var dirs := [Vector2i(1,0), Vector2i(-1,0), Vector2i(0,1), Vector2i(0,-1)]
		var dir: Vector2i = dirs[town_gen.rng.randi_range(0, 3)]
		var target := epos + dir
		if _in_bounds(target) and _is_walkable(target):
			entity.x = target.x
			entity.y = target.y

func _ai_civilian(entity: Dictionary) -> void:
	var epos := Vector2i(entity.x, entity.y)
	var ppos := game_state.player_pos
	var dist := absi(ppos.x - epos.x) + absi(ppos.y - epos.y)
	# Town 1-2: civilians stand still
	# Town 3+: civilians flee when player is close (within 2 tiles)
	# Town 5+: civilians flee faster and from further (3 tiles)
	if game_state.town_num < 3:
		return
	var flee_range := 2 if game_state.town_num < 5 else 3
	if dist <= flee_range:
		# Run away from player
		var dir := _step_toward(epos, ppos)
		var away := epos - dir
		if _in_bounds(away) and _is_walkable(away) and _entity_at(away) < 0:
			entity.x = away.x
			entity.y = away.y
		else:
			# Try perpendicular escape
			var perp := Vector2i(dir.y, dir.x)
			var alt := epos + perp
			if _in_bounds(alt) and _is_walkable(alt) and _entity_at(alt) < 0:
				entity.x = alt.x
				entity.y = alt.y
	elif town_gen.rng.randf() < 0.1:
		# Occasional wander
		var dirs := [Vector2i(1,0), Vector2i(-1,0), Vector2i(0,1), Vector2i(0,-1)]
		var dir: Vector2i = dirs[town_gen.rng.randi_range(0, 3)]
		var target := epos + dir
		if _in_bounds(target) and _is_walkable(target):
			entity.x = target.x
			entity.y = target.y

func _ai_flee(entity: Dictionary) -> void:
	var epos := Vector2i(entity.x, entity.y)
	var ppos := game_state.player_pos
	var dist := absi(ppos.x - epos.x) + absi(ppos.y - epos.y)
	if dist > GameData.PATROL_VISION:
		return
	var dir := _step_toward(epos, ppos)
	var away := epos - dir
	if _in_bounds(away) and _is_walkable(away):
		entity.x = away.x
		entity.y = away.y
	else:
		var perp := Vector2i(dir.y, dir.x)
		var alt := epos + perp
		if _in_bounds(alt) and _is_walkable(alt):
			entity.x = alt.x
			entity.y = alt.y

func _spawn_enemy(etype: String, near: Vector2i) -> void:
	var _dirs: Array[Vector2i] = [Vector2i(1,0), Vector2i(-1,0), Vector2i(0,1), Vector2i(0,-1)]
	for dir: Vector2i in _dirs:
		var pos: Vector2i = near + dir
		if _in_bounds(pos) and _is_walkable(pos) and pos != game_state.player_pos and _entity_at(pos) < 0:
			entities.append({"type": etype, "x": pos.x, "y": pos.y})
			return

func _advance_town() -> void:
	game_state.towns_cleared += 1
	game_state.town_num += 1
	game_state.infected_points = 0
	game_state.wanted_level = 0
	_show_message("Town cleared! Moving to town %d" % game_state.town_num)
	_generate_town()
	_update_hud()

# --- Game over ---

func _on_player_died() -> void:
	game_over = true
	career_data.total_runs += 1
	career_data.lifetime_infected += game_state.buildings_infected
	career_data.career_buildings += game_state.buildings_infected
	career_data.career_enemies += game_state.enemies_defeated
	career_data.career_pills += game_state.pills_collected
	career_data.career_max_town = maxi(career_data.career_max_town, game_state.town_num)
	career_data.best_score = maxi(career_data.best_score, game_state.get_score())
	if game_state.turn <= GameData.MERCY_REFUND_TURNS:
		career_data.keys += 1
	career_data.save()
	# Submit score on-chain if wallet connected
	if auth and auth.mode == AuthManager.Mode.WALLET and auth.blockchain.current_run_id != "":
		var score := game_state.get_score()
		var town := game_state.town_num
		var moves := game_state.total_moves
		# Integrity hash: runId:score:town:moves
		var payload := "%s:%d:%d:%d" % [auth.blockchain.current_run_id, score, town, moves]
		var integrity_hash := payload.sha256_text()
		auth.submit_score(score, town, moves, integrity_hash)
	_show_game_over()

func _show_game_over() -> void:
	var screen := Control.new()
	screen.set_script(preload("res://scripts/ui/game_over_screen.gd"))
	screen.set_anchors_preset(Control.PRESET_FULL_RECT)
	screen.setup(game_state, career_data)
	screen.try_again.connect(_on_try_again)
	screen.go_to_title.connect(_on_go_to_title)
	# Add to HUD layer so it renders above the game
	$HUD.add_child(screen)
	game_over_screen = screen

func _on_try_again() -> void:
	if game_over_screen:
		game_over_screen.queue_free()
		game_over_screen = null
	_start_run()

func _on_go_to_title() -> void:
	var title_scene: PackedScene = load("res://scenes/ui/title_screen.tscn")
	var title_inst: Control = title_scene.instantiate()
	if auth:
		title_inst.set_meta("auth_manager", auth)
	get_tree().root.add_child(title_inst)
	queue_free()

# --- HUD ---

func _update_hud() -> void:
	energy_label.text = "ENERGY %d" % game_state.energy
	power_label.text = "POWER %d" % game_state.power
	var wanted_str := "--"
	for i in game_state.wanted_level:
		wanted_str = "*".repeat(game_state.wanted_level)
	wanted_label.text = "WANTED %s" % wanted_str if game_state.wanted_level > 0 else "WANTED --"
	town_label.text = "TOWN %d" % game_state.town_num
	turn_label.text = "TURN %d" % game_state.turn
	score_label.text = "SCORE %d" % game_state.get_score()

func _show_message(text: String) -> void:
	message_label.text = text
	get_tree().create_timer(2.5).timeout.connect(
		func():
			if message_label.text == text:
				message_label.text = ""
	)

# --- Utilities ---

func _toggle_fullscreen() -> void:
	if DisplayServer.window_get_mode() == DisplayServer.WINDOW_MODE_FULLSCREEN:
		DisplayServer.window_set_mode(DisplayServer.WINDOW_MODE_WINDOWED)
	else:
		DisplayServer.window_set_mode(DisplayServer.WINDOW_MODE_FULLSCREEN)

func _in_bounds(pos: Vector2i) -> bool:
	return pos.x >= 0 and pos.x < GameData.GRID_SIZE and pos.y >= 0 and pos.y < GameData.GRID_SIZE

func _is_walkable(pos: Vector2i) -> bool:
	var tile: int = town_gen.grid[pos.y][pos.x]
	return tile != TownGenerator.Tile.BUILDING and tile != TownGenerator.Tile.INFECTED and tile != TownGenerator.Tile.EMPTY

func _entity_at(pos: Vector2i) -> int:
	for i in entities.size():
		if entities[i].x == pos.x and entities[i].y == pos.y:
			return i
	return -1

func _step_toward(from: Vector2i, to: Vector2i) -> Vector2i:
	var dx := signi(to.x - from.x)
	var dy := signi(to.y - from.y)
	if absi(to.x - from.x) >= absi(to.y - from.y):
		return Vector2i(dx, 0) if dx != 0 else Vector2i(0, dy)
	return Vector2i(0, dy) if dy != 0 else Vector2i(dx, 0)
