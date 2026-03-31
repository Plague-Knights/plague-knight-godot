## On-screen D-pad and action button for mobile/touch devices
## Auto-hides on desktop, shows on touch screens
extends CanvasLayer

var _font: Font = preload("res://assets/fonts/MedievalSharp-Regular.ttf")
var _visible := false

func _ready() -> void:
	# Show only on touch devices (web mobile, tablets)
	_visible = DisplayServer.is_touchscreen_available()
	if not _visible and OS.has_feature("web"):
		# Also check via JS for more reliable mobile detection
		_visible = _check_mobile_web()
	if _visible:
		_build_controls()

func _check_mobile_web() -> bool:
	if not OS.has_feature("web"):
		return false
	var result = JavaScriptBridge.eval("('ontouchstart' in window || navigator.maxTouchPoints > 0)")
	return result == true

func _build_controls() -> void:
	# D-pad (bottom-left)
	var dpad := Control.new()
	dpad.set_anchors_preset(Control.PRESET_BOTTOM_LEFT)
	dpad.offset_left = 10
	dpad.offset_top = -110
	dpad.offset_right = 110
	dpad.offset_bottom = -10
	add_child(dpad)

	_add_dpad_btn(dpad, "move_up",    "^", 33, 0,  34, 30)
	_add_dpad_btn(dpad, "move_down",  "v", 33, 70, 34, 30)
	_add_dpad_btn(dpad, "move_left",  "<", 0,  30, 30, 40)
	_add_dpad_btn(dpad, "move_right", ">", 70, 30, 30, 40)

	# Wait button (bottom-right)
	var wait_btn := _make_action_btn("wait_turn", "Wait", 60, 30)
	wait_btn.set_anchors_preset(Control.PRESET_BOTTOM_RIGHT)
	wait_btn.offset_left = -75
	wait_btn.offset_top = -45
	wait_btn.offset_right = -15
	wait_btn.offset_bottom = -15
	add_child(wait_btn)

func _add_dpad_btn(parent: Control, action: String, label: String, x: float, y: float, w: float, h: float) -> void:
	var btn := TouchScreenButton.new()
	btn.position = Vector2(x, y)

	# Create a visual shape
	var rect := ColorRect.new()
	rect.size = Vector2(w, h)
	rect.color = Color(0.15, 0.15, 0.12, 0.6)
	btn.add_child(rect)

	var lbl := Label.new()
	lbl.text = label
	lbl.add_theme_font_override("font", _font)
	lbl.add_theme_font_size_override("font_size", 10)
	lbl.add_theme_color_override("font_color", Color(0.4, 0.7, 0.3, 0.8))
	lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	lbl.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	lbl.size = Vector2(w, h)
	btn.add_child(lbl)

	btn.action = action
	btn.shape = RectangleShape2D.new()
	(btn.shape as RectangleShape2D).size = Vector2(w, h)
	btn.shape_centered = false
	parent.add_child(btn)

func _make_action_btn(action: String, label: String, w: float, h: float) -> TouchScreenButton:
	var btn := TouchScreenButton.new()

	var rect := ColorRect.new()
	rect.size = Vector2(w, h)
	rect.color = Color(0.15, 0.12, 0.08, 0.6)
	btn.add_child(rect)

	var lbl := Label.new()
	lbl.text = label
	lbl.add_theme_font_override("font", _font)
	lbl.add_theme_font_size_override("font_size", 8)
	lbl.add_theme_color_override("font_color", Color(0.7, 0.6, 0.3, 0.8))
	lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	lbl.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	lbl.size = Vector2(w, h)
	btn.add_child(lbl)

	btn.action = action
	btn.shape = RectangleShape2D.new()
	(btn.shape as RectangleShape2D).size = Vector2(w, h)
	btn.shape_centered = false
	return btn
