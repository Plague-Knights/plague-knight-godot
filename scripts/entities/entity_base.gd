## Base class for all grid entities (civilians, patrols, watchmen, etc.)
class_name EntityBase
extends Node2D

@export var entity_type: String = "civilian"
@export var move_speed: float = 6.0

var grid_pos := Vector2i.ZERO
var is_moving := false
var target_world_pos := Vector2.ZERO
var stunned_turns: int = 0

func _ready() -> void:
	target_world_pos = grid_to_world(grid_pos)
	position = target_world_pos

func _process(delta: float) -> void:
	if is_moving:
		position = position.move_toward(target_world_pos, move_speed * GameData.TILE_SIZE * delta)
		if position.distance_to(target_world_pos) < 0.5:
			position = target_world_pos
			is_moving = false

func setup(type: String, pos: Vector2i) -> void:
	entity_type = type
	grid_pos = pos
	target_world_pos = grid_to_world(pos)
	position = target_world_pos

func take_turn(game_state: GameState) -> void:
	if stunned_turns > 0:
		stunned_turns -= 1
		return

	match entity_type:
		"patrol":
			_patrol_ai(game_state)
		"night_watch":
			_night_watch_ai(game_state)
		"vault_keeper":
			_vault_keeper_ai(game_state)
		_:
			pass  # Civilians, watchmen, gatekeepers don't move

func _patrol_ai(game_state: GameState) -> void:
	var player_pos := game_state.player_pos
	var dist := abs(player_pos.x - grid_pos.x) + abs(player_pos.y - grid_pos.y)

	var dir := Vector2i.ZERO
	if dist <= GameData.PATROL_VISION:
		# Chase player
		var dx := signi(player_pos.x - grid_pos.x)
		var dy := signi(player_pos.y - grid_pos.y)
		if randf() < 0.5 and dx != 0:
			dir = Vector2i(dx, 0)
		elif dy != 0:
			dir = Vector2i(0, dy)
		elif dx != 0:
			dir = Vector2i(dx, 0)
	else:
		# Random wander
		var dirs := [Vector2i(1,0), Vector2i(-1,0), Vector2i(0,1), Vector2i(0,-1)]
		dir = dirs[randi() % 4]

	_try_move(dir)

func _night_watch_ai(game_state: GameState) -> void:
	# Aggressive pursuit
	var player_pos := game_state.player_pos
	var dx := signi(player_pos.x - grid_pos.x)
	var dy := signi(player_pos.y - grid_pos.y)
	var dir := Vector2i.ZERO
	if abs(dx) >= abs(dy) and dx != 0:
		dir = Vector2i(dx, 0)
	elif dy != 0:
		dir = Vector2i(0, dy)
	_try_move(dir)

func _vault_keeper_ai(game_state: GameState) -> void:
	# Flee from player
	var player_pos := game_state.player_pos
	var dx := signi(grid_pos.x - player_pos.x)
	var dy := signi(grid_pos.y - player_pos.y)
	var dir := Vector2i.ZERO
	if randf() < 0.5 and dx != 0:
		dir = Vector2i(dx, 0)
	elif dy != 0:
		dir = Vector2i(0, dy)
	elif dx != 0:
		dir = Vector2i(dx, 0)
	_try_move(dir)

func _try_move(dir: Vector2i) -> void:
	if dir == Vector2i.ZERO:
		return
	var target := grid_pos + dir
	if target.x < 0 or target.x >= GameData.GRID_SIZE or target.y < 0 or target.y >= GameData.GRID_SIZE:
		return
	# TODO: check walkability via grid reference
	grid_pos = target
	target_world_pos = grid_to_world(target)
	is_moving = true

func stun(turns: int) -> void:
	stunned_turns = turns

static func grid_to_world(gpos: Vector2i) -> Vector2:
	return Vector2(gpos) * GameData.TILE_SIZE + Vector2(GameData.TILE_SIZE / 2.0, GameData.TILE_SIZE / 2.0)
