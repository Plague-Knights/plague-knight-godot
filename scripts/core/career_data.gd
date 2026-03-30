## Persistent career data - saved between runs
class_name CareerData
extends RefCounted

const SAVE_PATH := "user://career.json"

var xp: int = 0
var total_runs: int = 0
var keys: int = GameData.STARTING_KEYS
var best_score: int = 0
var lifetime_infected: int = 0
var unlocked_mutations: Array[String] = []
var claimed_quests: Array[String] = []
var leaderboard: Array[Dictionary] = []
var daily_streak: int = 0
var last_play_date: String = ""
var daily_free_key_claimed: bool = false
var first_town_guard_kill: bool = false

# Career stats for quests
var career_buildings: int = 0
var career_enemies: int = 0
var career_pills: int = 0
var career_max_town: int = 0

func save() -> void:
	var data := {
		"xp": xp,
		"total_runs": total_runs,
		"keys": keys,
		"best_score": best_score,
		"lifetime_infected": lifetime_infected,
		"unlocked_mutations": unlocked_mutations,
		"claimed_quests": claimed_quests,
		"leaderboard": leaderboard,
		"daily_streak": daily_streak,
		"last_play_date": last_play_date,
		"daily_free_key_claimed": daily_free_key_claimed,
		"first_town_guard_kill": first_town_guard_kill,
		"career_buildings": career_buildings,
		"career_enemies": career_enemies,
		"career_pills": career_pills,
		"career_max_town": career_max_town,
	}
	var json := JSON.stringify(data, "\t")
	var file := FileAccess.open(SAVE_PATH, FileAccess.WRITE)
	if file:
		file.store_string(json)

func load_save() -> void:
	if not FileAccess.file_exists(SAVE_PATH):
		return
	var file := FileAccess.open(SAVE_PATH, FileAccess.READ)
	if not file:
		return
	var json := JSON.new()
	if json.parse(file.get_as_text()) != OK:
		return
	var data: Dictionary = json.data
	xp = data.get("xp", 0)
	total_runs = data.get("total_runs", 0)
	keys = data.get("keys", GameData.STARTING_KEYS)
	best_score = data.get("best_score", 0)
	lifetime_infected = data.get("lifetime_infected", 0)
	unlocked_mutations = Array(data.get("unlocked_mutations", []), TYPE_STRING, "", null)
	claimed_quests = Array(data.get("claimed_quests", []), TYPE_STRING, "", null)
	leaderboard = data.get("leaderboard", [])
	daily_streak = data.get("daily_streak", 0)
	last_play_date = data.get("last_play_date", "")
	daily_free_key_claimed = data.get("daily_free_key_claimed", false)
	first_town_guard_kill = data.get("first_town_guard_kill", false)
	career_buildings = data.get("career_buildings", 0)
	career_enemies = data.get("career_enemies", 0)
	career_pills = data.get("career_pills", 0)
	career_max_town = data.get("career_max_town", 0)

func check_daily_reset() -> void:
	var today := Time.get_date_string_from_system()
	if last_play_date != today:
		if last_play_date != "" and last_play_date != _yesterday():
			daily_streak = 0  # streak broken
		daily_free_key_claimed = false
		last_play_date = today
		save()

func claim_daily_key() -> bool:
	if daily_free_key_claimed:
		return false
	daily_free_key_claimed = true
	keys += 1
	daily_streak += 1
	save()
	return true

func _yesterday() -> String:
	var unix := Time.get_unix_time_from_system() - 86400
	var dt := Time.get_datetime_dict_from_unix_time(int(unix))
	return "%04d-%02d-%02d" % [dt.year, dt.month, dt.day]
