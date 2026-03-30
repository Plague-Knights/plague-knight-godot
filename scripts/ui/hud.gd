## HUD - displays player stats, wanted level, turn counter
extends CanvasLayer

@onready var energy_label: Label = $Panel/VBox/EnergyBar/Value
@onready var power_label: Label = $Panel/VBox/PowerBar/Value
@onready var infected_label: Label = $Panel/VBox/InfectedBar/Value
@onready var town_label: Label = $Panel/VBox/TownLabel
@onready var turn_label: Label = $Panel/VBox/TurnLabel
@onready var wanted_label: Label = $Panel/VBox/WantedLabel
@onready var energy_bar: ProgressBar = $Panel/VBox/EnergyBar/Bar
@onready var power_bar: ProgressBar = $Panel/VBox/PowerBar/Bar

var game_state: GameState

func bind(state: GameState) -> void:
	game_state = state
	state.energy_changed.connect(_on_energy)
	state.power_changed.connect(_on_power)
	state.infected_changed.connect(_on_infected)
	state.town_changed.connect(_on_town)
	state.wanted_changed.connect(_on_wanted)
	state.turn_advanced.connect(_on_turn)
	_refresh()

func _refresh() -> void:
	if not game_state:
		return
	_on_energy(game_state.energy)
	_on_power(game_state.power)
	_on_infected(game_state.infected_points)
	_on_town(game_state.town_num)
	_on_wanted(game_state.wanted_level)
	_on_turn(game_state.turn)

func _on_energy(val: int) -> void:
	if energy_label:
		energy_label.text = "%d/%d" % [val, game_state.max_energy if game_state else GameData.MAX_ENERGY]
	if energy_bar:
		energy_bar.max_value = game_state.max_energy if game_state else GameData.MAX_ENERGY
		energy_bar.value = val

func _on_power(val: int) -> void:
	if power_label:
		power_label.text = str(val)
	if power_bar:
		power_bar.max_value = 30  # visual cap
		power_bar.value = mini(val, 30)

func _on_infected(val: int) -> void:
	if infected_label:
		infected_label.text = str(val) + " pts"

func _on_town(val: int) -> void:
	if town_label:
		town_label.text = "Town %d" % val

func _on_wanted(level: int) -> void:
	if wanted_label:
		if level <= 0:
			wanted_label.text = ""
		else:
			wanted_label.text = "WANTED " + "*".repeat(level)
			wanted_label.modulate = Color(1, 0.3, 0.3) if level >= 3 else Color(1, 0.7, 0.3)

func _on_turn(val: int) -> void:
	if turn_label:
		turn_label.text = "Turn %d" % val
