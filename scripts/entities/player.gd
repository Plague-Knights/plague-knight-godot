## Player controller - grid-based movement with smooth animation
extends Node2D

signal moved(from: Vector2i, to: Vector2i)
signal bumped(direction: Vector2i)
signal interacted(target_pos: Vector2i)

@export var move_speed: float = 8.0  # tiles per second for animation

var grid_pos := Vector2i(6, 6)
var is_moving := false
var target_world_pos := Vector2.ZERO

var game_state: GameState
var turn_manager: TurnManager
var grid_ref: Node  # Reference to the grid/tilemap for collision checks

func _ready() -> void:
	target_world_pos = grid_to_world(grid_pos)
	position = target_world_pos

func _process(delta: float) -> void:
	if is_moving:
		position = position.move_toward(target_world_pos, move_speed * GameData.TILE_SIZE * delta)
		if position.distance_to(target_world_pos) < 0.5:
			position = target_world_pos
			is_moving = false
			moved.emit(grid_pos - _last_dir, grid_pos)
			if turn_manager:
				turn_manager.on_player_moved()

func _unhandled_input(event: InputEvent) -> void:
	if is_moving:
		return
	if turn_manager and not turn_manager.is_player_turn():
		return

	var dir := Vector2i.ZERO
	if event.is_action_pressed("move_up"):
		dir = Vector2i(0, -1)
	elif event.is_action_pressed("move_down"):
		dir = Vector2i(0, 1)
	elif event.is_action_pressed("move_left"):
		dir = Vector2i(-1, 0)
	elif event.is_action_pressed("move_right"):
		dir = Vector2i(1, 0)
	elif event.is_action_pressed("wait_turn"):
		# Pass turn
		if turn_manager:
			turn_manager.on_player_moved()
		return

	if dir != Vector2i.ZERO:
		try_move(dir)

var _last_dir := Vector2i.ZERO

func try_move(dir: Vector2i) -> void:
	var target := grid_pos + dir
	_last_dir = dir

	# Bounds check
	if target.x < 0 or target.x >= GameData.GRID_SIZE or target.y < 0 or target.y >= GameData.GRID_SIZE:
		_bump(dir)
		return

	# Collision check with grid
	if grid_ref and grid_ref.has_method("is_walkable"):
		if not grid_ref.is_walkable(target):
			_bump(dir)
			return

	# Check for entity at target
	if grid_ref and grid_ref.has_method("get_entity_at"):
		var entity = grid_ref.get_entity_at(target)
		if entity:
			interacted.emit(target)
			# Don't move into entity, but still spend the turn
			if turn_manager:
				turn_manager.on_player_moved()
			return

	# Move
	grid_pos = target
	target_world_pos = grid_to_world(grid_pos)
	is_moving = true

	# Spend energy
	if game_state and not game_state.can_move_free():
		game_state.energy -= GameData.MOVE_COST
	elif game_state and game_state.free_moves_remaining > 0:
		game_state.free_moves_remaining -= 1

func _bump(dir: Vector2i) -> void:
	# Visual bump animation
	var bump_offset := Vector2(dir) * GameData.TILE_SIZE * 0.15
	var tween := create_tween()
	tween.tween_property(self, "position", position + bump_offset, 0.06)
	tween.tween_property(self, "position", grid_to_world(grid_pos), 0.06)
	bumped.emit(dir)

func teleport_to(pos: Vector2i) -> void:
	grid_pos = pos
	target_world_pos = grid_to_world(pos)
	position = target_world_pos

static func grid_to_world(gpos: Vector2i) -> Vector2:
	return Vector2(gpos) * GameData.TILE_SIZE + Vector2(GameData.TILE_SIZE / 2.0, GameData.TILE_SIZE / 2.0)
