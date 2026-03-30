## Game Controller - main scene script, wires everything together
extends Node2D

@onready var grid_manager: GridManager = $GridManager
@onready var player: Node2D = $Player
@onready var turn_manager: TurnManager = $TurnManager
@onready var camera: Camera2D = $Player/Camera2D
@onready var entity_container: Node2D = $Entities

var game_state: GameState
var career: CareerData

func _ready() -> void:
	# Load career
	career = CareerData.new()
	career.load_save()
	career.check_daily_reset()

	# Start new run
	start_run()

func start_run() -> void:
	# Create game state
	game_state = GameState.new()

	# Generate town
	grid_manager.game_state = game_state
	grid_manager.generate_town(game_state.town_num)

	# Place player
	var start_pos := grid_manager.get_player_start()
	player.grid_pos = start_pos
	player.teleport_to(start_pos)
	player.game_state = game_state
	player.turn_manager = turn_manager
	player.grid_ref = grid_manager
	game_state.player_pos = start_pos

	# Wire turn manager
	turn_manager.game_state = game_state

	# Spawn entities
	_spawn_entities()

	# Wire player signals
	player.moved.connect(_on_player_moved)
	player.interacted.connect(_on_player_interacted)

	# Wire game state signals
	game_state.player_died.connect(_on_player_died)

	# Setup camera
	if camera:
		camera.position_smoothing_enabled = true
		camera.position_smoothing_speed = 8.0

	# HUD
	var hud = get_node_or_null("HUD")
	if hud and hud.has_method("bind"):
		hud.bind(game_state)

func _spawn_entities() -> void:
	# Clear existing
	for child in entity_container.get_children():
		child.queue_free()

	for spawn in grid_manager.generator.entity_spawns:
		var entity := EntityBase.new()
		entity.setup(spawn.type, Vector2i(spawn.x, spawn.y))

		# Color-code entities
		var sprite := _create_entity_sprite(spawn.type)
		entity.add_child(sprite)

		entity_container.add_child(entity)
		grid_manager.entities.append(entity)
		turn_manager.register_entity(entity)

func _create_entity_sprite(type: String) -> Node2D:
	var sprite := Node2D.new()
	sprite.set_script(load("res://scripts/ui/entity_sprite.gd"))
	sprite.set_meta("entity_type", type)
	return sprite

func _on_player_moved(from: Vector2i, to: Vector2i) -> void:
	game_state.player_pos = to
	game_state.total_moves += 1

	# Check for items
	var item := grid_manager.get_item_at(to)
	if item.size() > 0:
		_collect_item(item, to)

	grid_manager.queue_redraw()

func _collect_item(item: Dictionary, pos: Vector2i) -> void:
	match item.type:
		"trap":
			if not grid_manager.revealed_traps.has(pos):
				grid_manager.reveal_trap(pos)
				game_state.energy -= 1
				_show_floating_text(pos, "-1 Energy", Color(1, 0.3, 0.3))
		"hand_cart":
			game_state.power += GameData.HAND_CART_POWER
			grid_manager.remove_item_at(pos)
			_show_floating_text(pos, "+%d Power" % GameData.HAND_CART_POWER, Color(0.3, 0.6, 1))
		"virus":
			game_state.virus_turns_remaining = randi_range(GameData.VIRUS_DURATION_MIN, GameData.VIRUS_DURATION_MAX)
			grid_manager.remove_item_at(pos)
			_show_floating_text(pos, "VIRUS! %d turns" % game_state.virus_turns_remaining, Color(0.2, 0.8, 0.2))
		"pill":
			game_state.pills_collected += 1
			grid_manager.remove_item_at(pos)
			_show_floating_text(pos, "+1 Pill", Color(0.7, 0.3, 0.7))
		"horse_cart":
			_advance_town()

func _on_player_interacted(target_pos: Vector2i) -> void:
	var entity := grid_manager.get_entity_at(target_pos)
	if entity:
		_interact_with_entity(entity)

func _interact_with_entity(entity: EntityBase) -> void:
	var costs: Dictionary = GameData.ENTITY_COSTS.get(entity.entity_type, {})

	match entity.entity_type:
		"civilian":
			if game_state.power >= costs.get("power", 1):
				game_state.power -= costs.get("power", 1)
				game_state.infected_points += 1
				game_state.enemies_defeated += 1
				_show_floating_text(entity.grid_pos, "+1 Infected", Color(0.2, 0.8, 0.2))
				_remove_entity(entity)
		"night_watch":
			var power_cost: int = costs.get("power", 1)
			if game_state.power >= power_cost:
				game_state.power -= power_cost
			else:
				game_state.energy -= costs.get("energy", 2)
			entity.stun(costs.get("stun_turns", 2))
			_show_floating_text(entity.grid_pos, "Stunned!", Color(1, 1, 0.3))
		"town_guard":
			game_state.energy -= costs.get("energy", 3)
			var drop := randi_range(costs.get("power_drop_min", 3), costs.get("power_drop_max", 6))
			game_state.power += drop
			game_state.town_guards_killed += 1
			game_state.enemies_defeated += 1
			_show_floating_text(entity.grid_pos, "+%d Power" % drop, Color(0.3, 0.6, 1))
			_remove_entity(entity)
		"vault_keeper":
			var drop := randi_range(costs.get("power_drop_min", 2), costs.get("power_drop_max", 5))
			game_state.power += drop
			game_state.enemies_defeated += 1
			_show_floating_text(entity.grid_pos, "+%d Power" % drop, Color(0.3, 0.6, 1))
			_remove_entity(entity)
		_:
			# Watchman, Patrol, Gatekeeper
			game_state.energy -= costs.get("energy", 1)
			game_state.enemies_defeated += 1
			_show_floating_text(entity.grid_pos, "-%d Energy" % costs.get("energy", 1), Color(1, 0.3, 0.3))
			_remove_entity(entity)

func _remove_entity(entity: EntityBase) -> void:
	grid_manager.entities.erase(entity)
	turn_manager.unregister_entity(entity)
	entity.queue_free()

func _advance_town() -> void:
	game_state.towns_cleared += 1
	game_state.town_num += 1
	game_state.energy = game_state.max_energy  # restore energy
	game_state.infected_points = 0  # reset per-town
	game_state.wanted_level = 0

	grid_manager.generate_town(game_state.town_num)
	var start_pos := grid_manager.get_player_start()
	player.teleport_to(start_pos)
	game_state.player_pos = start_pos
	_spawn_entities()

	_show_floating_text(start_pos, "Town %d!" % game_state.town_num, Color(1, 0.85, 0.2))

func _on_player_died() -> void:
	# Update career stats
	career.lifetime_infected += game_state.infected_points
	career.career_buildings += game_state.buildings_infected
	career.career_enemies += game_state.enemies_defeated
	career.career_pills += game_state.pills_collected
	career.career_max_town = maxi(career.career_max_town, game_state.town_num)
	career.total_runs += 1

	var score := game_state.get_score()
	if score > career.best_score:
		career.best_score = score

	career.save()
	print("GAME OVER - Score: %d, Towns: %d, Infected: %d" % [score, game_state.towns_cleared, game_state.infected_points])

func _show_floating_text(pos: Vector2i, text: String, color: Color) -> void:
	var label := Label.new()
	label.text = text
	label.position = Vector2(pos) * GameData.TILE_SIZE
	label.add_theme_color_override("font_color", color)
	label.add_theme_font_size_override("font_size", 14)
	add_child(label)

	var tween := create_tween()
	tween.tween_property(label, "position:y", label.position.y - 40, 0.8)
	tween.parallel().tween_property(label, "modulate:a", 0.0, 0.8)
	tween.tween_callback(label.queue_free)
