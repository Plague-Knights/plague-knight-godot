## Player sprite - plague knight placeholder (colored shape)
extends Node2D

var virus_active := false

func _process(_delta: float) -> void:
	queue_redraw()

func _draw() -> void:
	var size := GameData.TILE_SIZE * 0.35
	var color := Color(0.2, 0.85, 0.3) if virus_active else Color(0.3, 0.9, 0.4)

	# Body
	draw_circle(Vector2.ZERO, size, color)

	# Plague glow when virus active
	if virus_active:
		draw_circle(Vector2.ZERO, size * 1.4, Color(0.2, 0.7, 0.2, 0.15))
		draw_circle(Vector2.ZERO, size * 1.8, Color(0.2, 0.6, 0.2, 0.08))

	# Outline
	draw_arc(Vector2.ZERO, size, 0, TAU, 32, color.lightened(0.4), 2.5)

	# Eyes
	draw_circle(Vector2(-5, -4), 3, Color.WHITE)
	draw_circle(Vector2(5, -4), 3, Color.WHITE)
	draw_circle(Vector2(-5, -4), 1.5, Color(0.1, 0.1, 0.1))
	draw_circle(Vector2(5, -4), 1.5, Color(0.1, 0.1, 0.1))

	# Label
	draw_string(ThemeDB.fallback_font, Vector2(-5, 18), "PK", HORIZONTAL_ALIGNMENT_CENTER, -1, 10, Color.WHITE)
