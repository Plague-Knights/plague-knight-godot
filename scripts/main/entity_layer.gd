## Renders entities (player + enemies) on the grid, respecting fog of war
extends Node2D

const ENTITY_COLORS := {
	"civilian":    Color(0.70, 0.70, 0.60),
	"watchman":    Color(0.90, 0.55, 0.20),
	"patrol":      Color(0.90, 0.25, 0.25),
	"gatekeeper":  Color(0.80, 0.20, 0.50),
	"town_guard":  Color(0.95, 0.10, 0.10),
	"night_watch": Color(0.50, 0.20, 0.80),
	"vault_keeper":Color(0.90, 0.80, 0.20),
}

const PLAYER_COLOR := Color(0.15, 0.90, 0.90)

func _draw() -> void:
	var gm: Node2D = get_parent()
	if not gm.game_state:
		return
	var ts: int = GameData.TILE_SIZE
	var half := ts * 0.5
	var radius := ts * 0.32

	# Entities - only draw if on a visible tile
	for i in gm.entities.size():
		var entity: Dictionary = gm.entities[i]
		if not gm.fog_visible[entity.y][entity.x]:
			continue
		var color: Color = ENTITY_COLORS.get(entity.type, Color.WHITE)
		if entity.get("stunned", 0) > 0:
			color = color.darkened(0.5)
		var center := Vector2(entity.x * ts + half, entity.y * ts + half)
		draw_circle(center, radius, color)
		var letter: String = entity.type[0].to_upper()
		draw_string(ThemeDB.fallback_font, center + Vector2(-5, 5), letter,
			HORIZONTAL_ALIGNMENT_CENTER, -1, 14, Color.WHITE)

	# Player (always visible)
	var pp: Vector2i = gm.game_state.player_pos
	var pc: Vector2 = Vector2(pp.x * ts + half, pp.y * ts + half)
	draw_circle(pc, radius + 2, Color.WHITE)
	draw_circle(pc, radius, PLAYER_COLOR)
	draw_string(ThemeDB.fallback_font, pc + Vector2(-5, 5), "P",
		HORIZONTAL_ALIGNMENT_CENTER, -1, 14, Color.BLACK)
