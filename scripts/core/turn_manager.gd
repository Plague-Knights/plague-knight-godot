## Turn Manager - orchestrates the turn-based game loop
## Flow: Player Input -> Player Move -> Entity AI -> Resolve -> Next Turn
class_name TurnManager
extends Node

signal player_turn_started
signal player_turn_ended
signal entities_turn_started
signal entities_turn_ended
signal turn_resolved(turn_num: int)

enum Phase { WAITING_INPUT, PLAYER_MOVING, ENTITIES_MOVING, RESOLVING }

var phase: Phase = Phase.WAITING_INPUT
var game_state: GameState
var entities: Array[Node] = []

func _ready() -> void:
	phase = Phase.WAITING_INPUT
	player_turn_started.emit()

func start_player_turn() -> void:
	phase = Phase.WAITING_INPUT
	player_turn_started.emit()

func on_player_moved() -> void:
	phase = Phase.ENTITIES_MOVING
	player_turn_ended.emit()
	entities_turn_started.emit()
	await process_entities()
	phase = Phase.RESOLVING
	entities_turn_ended.emit()
	resolve_turn()

func process_entities() -> void:
	for entity in entities:
		if entity.has_method("take_turn"):
			entity.take_turn(game_state)
			# Small delay between entity moves for visual clarity
			await get_tree().create_timer(0.05).timeout

func resolve_turn() -> void:
	if game_state:
		game_state.advance_turn()
		turn_resolved.emit(game_state.turn)

	# Check death
	if game_state and game_state.energy <= 0:
		return  # GameState emits player_died

	start_player_turn()

func register_entity(entity: Node) -> void:
	if entity not in entities:
		entities.append(entity)

func unregister_entity(entity: Node) -> void:
	entities.erase(entity)

func is_player_turn() -> bool:
	return phase == Phase.WAITING_INPUT
