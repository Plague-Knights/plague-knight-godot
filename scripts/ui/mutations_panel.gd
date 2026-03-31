## Builds the Mutation Tree panel UI dynamically from data
extends Control

signal closed

const BRANCH_COLORS := {
	"Virulence":  Color(0.3, 0.8, 0.2),
	"Survival":   Color(0.3, 0.5, 0.9),
	"Mobility":   Color(0.9, 0.8, 0.2),
	"Efficiency": Color(0.7, 0.4, 0.8),
	"Dominance":  Color(0.9, 0.4, 0.2),
}

const BRANCH_ICONS := {
	"Virulence":  "☣",
	"Survival":   "♥",
	"Mobility":   "⚡",
	"Efficiency": "✣",
	"Dominance":  "☠",
}

const MUTATIONS := {
	"Virulence": [
		{"tier": "BASIC", "name": "Infection Chains I", "desc": "20% chance free infection spread", "xp": 75},
		{"tier": "ADVANCED", "name": "Plague Carrier", "desc": "10% power refund on kill", "xp": 200},
		{"tier": "MASTERY", "name": "Infection Chains II", "desc": "40% chance free infection spread", "xp": 500},
	],
	"Survival": [
		{"tier": "BASIC", "name": "Resilient Strain I", "desc": "10% dodge chance", "xp": 80},
		{"tier": "ADVANCED", "name": "Energy Reserve I", "desc": "+5 max energy", "xp": 200},
		{"tier": "MASTERY", "name": "Resilient Strain II", "desc": "20% dodge chance", "xp": 500},
	],
	"Mobility": [
		{"tier": "BASIC", "name": "Swift Plague I", "desc": "First 5 moves per town free", "xp": 60},
		{"tier": "ADVANCED", "name": "Pathfinder's Eye", "desc": "+1 vision range", "xp": 175},
		{"tier": "MASTERY", "name": "Swift Plague II", "desc": "First 10 moves per town free", "xp": 450},
	],
	"Efficiency": [
		{"tier": "BASIC", "name": "Opportunist I", "desc": "Shops give +1 power", "xp": 70},
		{"tier": "ADVANCED", "name": "Pill Collector", "desc": "20% more pill drops", "xp": 180},
		{"tier": "MASTERY", "name": "Opportunist II", "desc": "Shops give +2 power", "xp": 480},
	],
	"Dominance": [
		{"tier": "BASIC", "name": "Intimidation I", "desc": "Wanted rises 25% slower", "xp": 90},
		{"tier": "ADVANCED", "name": "Dark Authority", "desc": "Guards spawn less often", "xp": 220},
		{"tier": "MASTERY", "name": "Intimidation II", "desc": "1.5x infection points", "xp": 550},
	],
}

var career_xp: int = 0
var unlocked: Array = []
var _font: Font = preload("res://assets/fonts/MedievalSharp-Regular.ttf")

func _ready() -> void:
	pass

func show_panel() -> void:
	_build_ui()

func set_career_data(xp: int, unlocked_mutations: Array = []) -> void:
	career_xp = xp
	unlocked = unlocked_mutations

func _build_ui() -> void:
	# Dim
	var dim := ColorRect.new()
	dim.set_anchors_preset(Control.PRESET_FULL_RECT)
	dim.color = Color(0, 0, 0, 0.8)
	add_child(dim)

	# Panel centered
	var panel := PanelContainer.new()
	panel.set_anchors_preset(Control.PRESET_CENTER)
	panel.offset_left = -150
	panel.offset_top = -160
	panel.offset_right = 150
	panel.offset_bottom = 160
	add_child(panel)

	var outer := VBoxContainer.new()
	outer.add_theme_constant_override("separation", 3)
	panel.add_child(outer)

	# Header
	var header := HBoxContainer.new()
	header.add_theme_constant_override("separation", 4)
	outer.add_child(header)

	var title_lbl := _label("Mutation Tree", 9, Color(0.3, 0.8, 0.2))
	title_lbl.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	header.add_child(title_lbl)

	header.add_child(_label("XP: %d / %d" % [career_xp, GameData.MAX_XP], 6, Color(0.9, 0.75, 0.2)))

	var close_btn := Button.new()
	close_btn.text = "x"
	close_btn.custom_minimum_size = Vector2(12, 12)
	close_btn.add_theme_font_override("font", _font)
	close_btn.add_theme_font_size_override("font_size", 6)
	close_btn.pressed.connect(func(): closed.emit())
	header.add_child(close_btn)

	# Scroll
	var scroll := ScrollContainer.new()
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	outer.add_child(scroll)

	var branches := VBoxContainer.new()
	branches.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	branches.add_theme_constant_override("separation", 3)
	scroll.add_child(branches)

	for branch_name in ["Virulence", "Survival", "Mobility", "Efficiency", "Dominance"]:
		_build_branch(branches, branch_name)

func _build_branch(parent: VBoxContainer, branch_name: String) -> void:
	var color: Color = BRANCH_COLORS[branch_name]
	var icon: String = BRANCH_ICONS[branch_name]
	var mutations: Array = MUTATIONS[branch_name]

	var branch_panel := PanelContainer.new()
	parent.add_child(branch_panel)

	var vbox := VBoxContainer.new()
	vbox.add_theme_constant_override("separation", 2)
	branch_panel.add_child(vbox)

	vbox.add_child(_label("%s  %s" % [icon, branch_name], 7, color))

	# Cards row
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 2)
	vbox.add_child(row)

	for mut in mutations:
		row.add_child(_build_card(mut))

func _build_card(mut: Dictionary) -> PanelContainer:
	var card := PanelContainer.new()
	card.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	card.custom_minimum_size = Vector2(88, 38)

	var vbox := VBoxContainer.new()
	vbox.add_theme_constant_override("separation", 0)
	card.add_child(vbox)

	# Tier
	var tier := _label(str(mut.tier), 3, Color(0.4, 0.38, 0.32))
	tier.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	vbox.add_child(tier)

	# Name
	var name_lbl := _label(str(mut.name), 5, Color(0.75, 0.7, 0.6))
	name_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	name_lbl.autowrap_mode = TextServer.AUTOWRAP_WORD
	vbox.add_child(name_lbl)

	# Desc
	var desc_lbl := _label(str(mut.desc), 4, Color(0.48, 0.45, 0.38))
	desc_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	desc_lbl.autowrap_mode = TextServer.AUTOWRAP_WORD
	vbox.add_child(desc_lbl)

	# XP
	var is_owned := str(mut.name) in unlocked
	var can_buy := career_xp >= int(mut.xp)
	var xp_text: String
	var xp_color: Color
	if is_owned:
		xp_text = "UNLOCKED"
		xp_color = Color(0.3, 0.8, 0.3)
	elif can_buy:
		xp_text = "%d XP" % int(mut.xp)
		xp_color = Color(0.9, 0.8, 0.2)
	else:
		xp_text = "%d XP" % int(mut.xp)
		xp_color = Color(0.35, 0.32, 0.28)

	var xp_lbl := _label(xp_text, 4, xp_color)
	xp_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	vbox.add_child(xp_lbl)

	return card

func _label(text: String, size: int, color: Color) -> Label:
	var lbl := Label.new()
	lbl.text = text
	lbl.add_theme_font_override("font", _font)
	lbl.add_theme_font_size_override("font_size", size)
	lbl.add_theme_color_override("font_color", color)
	return lbl
