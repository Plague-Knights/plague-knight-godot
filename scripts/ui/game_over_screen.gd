## Game Over screen — shows run stats, XP earned, and options
extends Control

signal try_again
signal go_to_title

var game_state: GameState
var career_data: CareerData
var xp_earned: int = 0
var _font: Font = preload("res://assets/fonts/MedievalSharp-Regular.ttf")

func setup(gs: GameState, cd: CareerData) -> void:
	game_state = gs
	career_data = cd
	xp_earned = _calculate_xp()

func _ready() -> void:
	_build_ui()

func _calculate_xp() -> int:
	if not game_state:
		return 0
	var score := game_state.get_score()
	var run_count := career_data.total_runs if career_data else 1
	var diminish := maxf(0.3, 1.0 - run_count * 0.02)
	return int(score * diminish)

func _build_ui() -> void:
	# Full-screen dim
	var dim := ColorRect.new()
	dim.set_anchors_preset(Control.PRESET_FULL_RECT)
	dim.color = Color(0.02, 0.02, 0.03, 0.93)
	add_child(dim)

	# Main VBox — anchored to center of screen
	var vbox := VBoxContainer.new()
	vbox.set_anchors_preset(Control.PRESET_CENTER)
	vbox.offset_left = -140
	vbox.offset_top = -150
	vbox.offset_right = 140
	vbox.offset_bottom = 150
	vbox.grow_horizontal = Control.GROW_DIRECTION_BOTH
	vbox.grow_vertical = Control.GROW_DIRECTION_BOTH
	vbox.add_theme_constant_override("separation", 2)
	vbox.alignment = BoxContainer.ALIGNMENT_CENTER
	add_child(vbox)

	# Title
	_add_label(vbox, "The Plague Fades...", 14, Color(0.2, 0.85, 0.2))
	_add_spacer(vbox, 2)
	_add_label(vbox, "Your energy is spent. The plague knight falls.", 6, Color(0.5, 0.5, 0.4))
	_add_spacer(vbox, 8)

	# Stats container — centered
	if game_state:
		var stats := VBoxContainer.new()
		stats.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
		stats.add_theme_constant_override("separation", 1)
		vbox.add_child(stats)

		_add_stat_row(stats, "Towns cleared:", str(game_state.towns_cleared))
		_add_stat_row(stats, "Buildings infected:", str(game_state.buildings_infected))
		_add_stat_row(stats, "Infected points:", str(game_state.infected_points))
		_add_stat_row(stats, "Enemies defeated:", str(game_state.enemies_defeated))
		_add_stat_row(stats, "Pills collected:", str(game_state.pills_collected))
		_add_stat_row(stats, "Total moves:", str(game_state.total_moves))

		var elapsed := Time.get_unix_time_from_system() - game_state.run_start_time
		_add_stat_row(stats, "Time:", "%dm %ds" % [int(elapsed) / 60, int(elapsed) % 60])

		_add_spacer(vbox, 5)
		_add_label(vbox, "Final Score: %d" % game_state.get_score(), 10, Color(0.85, 0.3, 0.2))

	_add_spacer(vbox, 4)

	# XP
	var total_xp := career_data.xp if career_data else 0
	var run_num := career_data.total_runs if career_data else 1
	_add_label(vbox, "+%d XP earned - Total XP: %d / %d (Run #%d)" % [xp_earned, total_xp, GameData.MAX_XP, run_num], 5, Color(0.8, 0.7, 0.2))

	if game_state and game_state.turn <= GameData.MERCY_REFUND_TURNS:
		_add_label(vbox, "Mercy refund: +1 key returned", 5, Color(0.5, 0.8, 0.4))

	_add_spacer(vbox, 10)

	# Buttons
	var retry_btn := _make_button("Try Again", 9, Vector2(120, 20))
	retry_btn.pressed.connect(func(): try_again.emit())
	vbox.add_child(retry_btn)

	_add_spacer(vbox, 2)

	var title_btn := _make_button("Main Menu", 7, Vector2(90, 17))
	title_btn.pressed.connect(func(): go_to_title.emit())
	vbox.add_child(title_btn)

func _add_label(parent: Control, text: String, size: int, color: Color) -> void:
	var lbl := Label.new()
	lbl.text = text
	lbl.add_theme_font_override("font", _font)
	lbl.add_theme_font_size_override("font_size", size)
	lbl.add_theme_color_override("font_color", color)
	lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	lbl.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	parent.add_child(lbl)

func _add_stat_row(parent: Control, label_text: String, value_text: String) -> void:
	var row := HBoxContainer.new()
	row.custom_minimum_size = Vector2(180, 0)
	row.add_theme_constant_override("separation", 4)
	parent.add_child(row)

	var lbl := Label.new()
	lbl.text = label_text
	lbl.add_theme_font_override("font", _font)
	lbl.add_theme_font_size_override("font_size", 6)
	lbl.add_theme_color_override("font_color", Color(0.55, 0.5, 0.4))
	lbl.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	row.add_child(lbl)

	var val := Label.new()
	val.text = value_text
	val.add_theme_font_override("font", _font)
	val.add_theme_font_size_override("font_size", 7)
	val.add_theme_color_override("font_color", Color(0.8, 0.75, 0.6))
	val.custom_minimum_size = Vector2(30, 0)
	row.add_child(val)

func _add_spacer(parent: Control, h: int) -> void:
	var s := Control.new()
	s.custom_minimum_size = Vector2(0, h)
	parent.add_child(s)

func _make_button(text: String, size: int, min_size: Vector2) -> Button:
	var btn := Button.new()
	btn.text = text
	btn.custom_minimum_size = min_size
	btn.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	btn.add_theme_font_override("font", _font)
	btn.add_theme_font_size_override("font_size", size)
	return btn
