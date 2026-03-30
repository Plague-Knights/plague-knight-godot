## Manages all runtime game state for a single run
class_name GameState
extends RefCounted

signal energy_changed(value: int)
signal power_changed(value: int)
signal infected_changed(value: int)
signal wanted_changed(level: int)
signal town_changed(num: int)
signal player_died
signal turn_advanced(turn: int)

# Player stats
var energy: int = GameData.START_ENERGY:
	set(v):
		energy = clampi(v, 0, max_energy)
		energy_changed.emit(energy)
		if energy <= 0:
			player_died.emit()

var power: int = GameData.START_POWER:
	set(v):
		power = clampi(v, 0, GameData.MAX_POWER)
		power_changed.emit(power)

var max_energy: int = GameData.MAX_ENERGY
var vision: int = GameData.BASE_VISION

# Position
var player_pos := Vector2i(6, 6)

# Town
var town_num: int = 1:
	set(v):
		town_num = v
		town_changed.emit(town_num)

var infected_points: int = 0:
	set(v):
		infected_points = v
		infected_changed.emit(infected_points)
		_update_wanted()

var wanted_level: int = 0

# Run tracking
var turn: int = 0
var total_moves: int = 0
var buildings_infected: int = 0
var enemies_defeated: int = 0
var town_guards_killed: int = 0
var pills_collected: int = 0
var towns_cleared: int = 0
var run_start_time: float = 0.0

# Virus pickup state
var virus_turns_remaining: int = 0
var free_moves_remaining: int = 0

# Active mutations (loaded from career)
var active_mutations: Array[String] = []

# Items collected this run
var items: Dictionary = {}

func _init() -> void:
	run_start_time = Time.get_unix_time_from_system()

func advance_turn() -> void:
	turn += 1
	if virus_turns_remaining > 0:
		virus_turns_remaining -= 1
	turn_advanced.emit(turn)

func _update_wanted() -> void:
	var town_infected := infected_points  # per-town tracking
	var thresholds := GameData.WANTED_THRESHOLDS
	var new_wanted := 0
	for threshold in thresholds:
		if town_infected >= threshold:
			new_wanted += 1
	if new_wanted != wanted_level:
		wanted_level = new_wanted
		wanted_changed.emit(wanted_level)

func get_score() -> int:
	return infected_points + (towns_cleared * GameData.TOWN_CLEAR_SCORE) + (pills_collected * GameData.PILL_SCORE)

func is_virus_active() -> bool:
	return virus_turns_remaining > 0

func can_move_free() -> bool:
	return is_virus_active() or free_moves_remaining > 0
