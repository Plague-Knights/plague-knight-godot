## Simple colored circle sprite for entities (placeholder until real art)
extends Node2D

const TYPE_COLORS := {
	"civilian": Color(0.6, 0.7, 0.5),
	"watchman": Color(0.3, 0.4, 0.7),
	"patrol": Color(0.7, 0.4, 0.2),
	"gatekeeper": Color(0.5, 0.2, 0.2),
	"town_guard": Color(0.8, 0.2, 0.2),
	"night_watch": Color(0.2, 0.2, 0.4),
	"vault_keeper": Color(0.7, 0.6, 0.2),
}

const TYPE_LABELS := {
	"civilian": "C",
	"watchman": "W",
	"patrol": "P",
	"gatekeeper": "GK",
	"town_guard": "TG",
	"night_watch": "NW",
	"vault_keeper": "VK",
}

func _draw() -> void:
	var etype: String = get_meta("entity_type", "civilian")
	var color: Color = TYPE_COLORS.get(etype, Color.WHITE)
	var radius := GameData.TILE_SIZE * 0.3

	# Body circle
	draw_circle(Vector2.ZERO, radius, color)
	# Outline
	draw_arc(Vector2.ZERO, radius, 0, TAU, 32, color.lightened(0.3), 2.0)

	# Label
	var label := TYPE_LABELS.get(etype, "?")
	draw_string(ThemeDB.fallback_font, Vector2(-6, 5), label, HORIZONTAL_ALIGNMENT_CENTER, -1, 11, Color.WHITE)
