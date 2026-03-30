## Renders entities (player + enemies) with pixel art sprites, respecting fog of war
extends Node2D

var tex_entities: Dictionary = {}

func _ready() -> void:
	tex_entities = {
		"player":      load("res://assets/extracted/player.png"),
		"civilian":    load("res://assets/extracted/civilian.png"),
		"watchman":    load("res://assets/extracted/watchman.png"),
		"patrol":      load("res://assets/extracted/patrol.png"),
		"gatekeeper":  load("res://assets/extracted/gatekeeper.png"),
		"town_guard":  load("res://assets/extracted/townGuard.png"),
		"night_watch": load("res://assets/extracted/nightWatch.png"),
		"vault_keeper":load("res://assets/extracted/vaultKeeper.png"),
	}

func _draw() -> void:
	var gm: Node2D = get_parent()
	if not gm.game_state:
		return
	var ts: int = GameData.TILE_SIZE

	# Entities - only draw if on a visible tile
	for i in gm.entities.size():
		var entity: Dictionary = gm.entities[i]
		if not gm.fog_visible[entity.y][entity.x]:
			continue
		var tex: Texture2D = tex_entities.get(entity.type)
		var rect := Rect2(entity.x * ts, entity.y * ts, ts, ts)
		if tex:
			if entity.get("stunned", 0) > 0:
				draw_texture_rect(tex, rect, false, Color(0.4, 0.4, 0.6))
			else:
				draw_texture_rect(tex, rect, false)
		else:
			# Fallback circle
			var center := Vector2(entity.x * ts + ts * 0.5, entity.y * ts + ts * 0.5)
			draw_circle(center, ts * 0.32, Color.RED)

	# Player (always visible)
	var pp: Vector2i = gm.game_state.player_pos
	var player_rect := Rect2(pp.x * ts, pp.y * ts, ts, ts)
	var player_tex: Texture2D = tex_entities.get("player")
	if player_tex:
		draw_texture_rect(player_tex, player_rect, false)
