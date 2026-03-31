## On-screen D-pad and action button for mobile/touch devices
## Auto-hides on desktop, shows on touch screens
extends CanvasLayer

var _font: Font = preload("res://assets/fonts/MedievalSharp-Regular.ttf")
var _visible := false

signal direction_pressed(dir: Vector2i)
signal wait_pressed

func _ready() -> void:
	_visible = DisplayServer.is_touchscreen_available()
	if not _visible and OS.has_feature("web"):
		_visible = _check_mobile_web()
	if _visible:
		_build_controls()

func _check_mobile_web() -> bool:
	if not OS.has_feature("web"):
		return false
	var result = JavaScriptBridge.eval("('ontouchstart' in window || navigator.maxTouchPoints > 0)")
	return result == true

func _build_controls() -> void:
	# Root control - passes input through to game
	var root := Control.new()
	root.set_anchors_preset(Control.PRESET_FULL_RECT)
	root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(root)

	# D-pad container (bottom-right)
	var dpad := Control.new()
	dpad.mouse_filter = Control.MOUSE_FILTER_IGNORE
	dpad.set_anchors_preset(Control.PRESET_BOTTOM_RIGHT)
	dpad.offset_left = -176
	dpad.offset_top = -180
	dpad.offset_right = -16
	dpad.offset_bottom = -16
	root.add_child(dpad)

	_add_dpad_btn(dpad, Vector2i(0, -1), "^", 53, 0,  54, 50)
	_add_dpad_btn(dpad, Vector2i(0, 1),  "v", 53, 114, 54, 50)
	_add_dpad_btn(dpad, Vector2i(-1, 0), "<", 0,  52, 50, 60)
	_add_dpad_btn(dpad, Vector2i(1, 0),  ">", 110, 52, 50, 60)

	# Wait button (bottom-left)
	var wait_btn := _make_btn("Wait", 80, 44, Color(0.15, 0.12, 0.08, 0.75),
		Color(0.85, 0.75, 0.4, 0.95), 14)
	wait_btn.set_anchors_preset(Control.PRESET_BOTTOM_LEFT)
	wait_btn.offset_left = 16
	wait_btn.offset_top = -60
	wait_btn.offset_right = 96
	wait_btn.offset_bottom = -16
	wait_btn.pressed.connect(_on_wait_pressed)
	root.add_child(wait_btn)

func _add_dpad_btn(parent: Control, dir: Vector2i, label: String, x: float, y: float, w: float, h: float) -> void:
	var btn := _make_btn(label, w, h, Color(0.15, 0.15, 0.12, 0.75),
		Color(0.5, 0.85, 0.4, 0.95), 18)
	btn.position = Vector2(x, y)
	btn.pressed.connect(_on_dir_pressed.bind(dir))
	parent.add_child(btn)

func _make_btn(label: String, w: float, h: float, bg_color: Color, font_color: Color, font_size: int) -> Button:
	var btn := Button.new()
	btn.text = label
	btn.custom_minimum_size = Vector2(w, h)
	btn.size = Vector2(w, h)
	btn.add_theme_font_override("font", _font)
	btn.add_theme_font_size_override("font_size", font_size)
	btn.add_theme_color_override("font_color", font_color)
	var style := StyleBoxFlat.new()
	style.bg_color = bg_color
	style.set_corner_radius_all(4)
	btn.add_theme_stylebox_override("normal", style)
	btn.add_theme_stylebox_override("hover", style)
	var pressed_style := StyleBoxFlat.new()
	pressed_style.bg_color = Color(bg_color.r + 0.1, bg_color.g + 0.1, bg_color.b + 0.08, 0.85)
	pressed_style.set_corner_radius_all(4)
	btn.add_theme_stylebox_override("pressed", pressed_style)
	var focus_style := StyleBoxEmpty.new()
	btn.add_theme_stylebox_override("focus", focus_style)
	return btn

func _on_dir_pressed(dir: Vector2i) -> void:
	direction_pressed.emit(dir)

func _on_wait_pressed() -> void:
	wait_pressed.emit()
