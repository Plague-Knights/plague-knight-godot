## Title screen — Begin Infection / Mutations / Leaderboard / Wallet / Buy Keys
extends Control

var auth: AuthManager
var showing_panel := false
var active_panel: Control = null

@onready var title_label: Label = $VBox/TitleLabel
@onready var subtitle_label: Label = $VBox/SubtitleLabel
@onready var guest_btn: Button = $VBox/Buttons/GuestBtn
@onready var mutations_btn: Button = $VBox/Buttons/MutationsBtn
@onready var leaderboard_btn: Button = $VBox/Buttons/LeaderboardBtn
@onready var wallet_btn: Button = $VBox/Buttons/WalletBtn
@onready var buy_btn: Button = $VBox/Buttons/BuyBtn
@onready var daily_btn: Button = $VBox/Buttons/DailyBtn
@onready var status_label: Label = $VBox/StatusLabel
@onready var keys_label: Label = $VBox/KeysLabel
@onready var overlay: Control = $Overlay
@onready var panel_title: Label = $Overlay/Panel/PanelVBox/PanelTitle
@onready var panel_content: Label = $Overlay/Panel/PanelVBox/PanelContent
@onready var panel_close: Button = $Overlay/Panel/PanelVBox/CloseBtn

func _ready() -> void:
	if has_meta("auth_manager"):
		auth = get_meta("auth_manager")
	else:
		auth = AuthManager.new()
	auth.auth_changed.connect(_on_auth_changed)
	auth.keys_updated.connect(_on_keys_updated)

	guest_btn.pressed.connect(_on_guest_pressed)
	mutations_btn.pressed.connect(_on_mutations_pressed)
	leaderboard_btn.pressed.connect(_on_leaderboard_pressed)
	wallet_btn.pressed.connect(_on_wallet_pressed)
	buy_btn.pressed.connect(_on_buy_pressed)
	daily_btn.pressed.connect(_on_daily_pressed)
	panel_close.pressed.connect(_close_panel)

	buy_btn.visible = false
	daily_btn.visible = false
	keys_label.text = ""
	status_label.text = ""
	overlay.visible = false

	if not auth.blockchain.is_web:
		wallet_btn.text = "Wallet (Web Only)"
		wallet_btn.disabled = true

	# Restore UI if returning from game
	if auth.mode == AuthManager.Mode.WALLET:
		_on_auth_changed("wallet", auth.wallet_address)
		_on_keys_updated(auth.key_balance)
	elif auth.mode == AuthManager.Mode.GUEST:
		keys_label.text = "Keys: %d" % auth.key_balance

func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("toggle_fullscreen"):
		if DisplayServer.window_get_mode() == DisplayServer.WINDOW_MODE_FULLSCREEN:
			DisplayServer.window_set_mode(DisplayServer.WINDOW_MODE_WINDOWED)
		else:
			DisplayServer.window_set_mode(DisplayServer.WINDOW_MODE_FULLSCREEN)

# --- Button Handlers ---

func _on_guest_pressed() -> void:
	# Close any open panel first
	if showing_panel:
		_close_panel()
		_close_active_panel()
	if auth.mode == AuthManager.Mode.GUEST:
		auth.start_guest()
		auth.key_balance = GameData.STARTING_KEYS
	_begin_run()

func _on_wallet_pressed() -> void:
	status_label.text = "Connecting wallet..."
	wallet_btn.disabled = true
	auth.connect_wallet()

func _on_buy_pressed() -> void:
	if showing_panel:
		return
	status_label.text = "Confirm purchase in wallet..."
	buy_btn.disabled = true
	auth.buy_keys(1, func(success: bool):
		buy_btn.disabled = false
		if success:
			status_label.text = "Key purchased!"
		else:
			status_label.text = "Purchase failed or cancelled"
	)

func _on_daily_pressed() -> void:
	daily_btn.disabled = true
	status_label.text = "Claiming daily key..."
	auth.claim_daily(func(success: bool):
		if success:
			status_label.text = "Daily key claimed!"
		else:
			status_label.text = "Already claimed today"
		daily_btn.text = "Daily Claimed"
		daily_btn.disabled = true
	)

func _on_mutations_pressed() -> void:
	if showing_panel:
		return
	showing_panel = true
	var container := Control.new()
	container.anchor_right = 1.0
	container.anchor_bottom = 1.0
	add_child(container)
	container.set_script(preload("res://scripts/ui/mutations_panel.gd"))
	container.set_career_data(0, [])
	container.show_panel()
	active_panel = container
	container.closed.connect(_close_active_panel)

func _on_leaderboard_pressed() -> void:
	if showing_panel:
		return
	if auth.mode == AuthManager.Mode.WALLET:
		status_label.text = "Loading leaderboard..."
		auth.get_leaderboard(func(data: Dictionary):
			status_label.text = ""
			_show_leaderboard(data)
		)
	else:
		_show_leaderboard({})

# --- Run Start ---

func _begin_run() -> void:
	if auth.mode == AuthManager.Mode.WALLET:
		if not auth.can_start_run():
			status_label.text = "No keys! Buy or claim daily."
			return
		status_label.text = "Starting run..."
		guest_btn.disabled = true
		auth.spend_key_for_run(func(success: bool, run_id: String, paid: bool):
			guest_btn.disabled = false
			if success:
				_launch_game()
			else:
				status_label.text = "Failed to start run. No keys?"
		)
	else:
		# Guest mode — just launch
		_launch_game()

func _launch_game() -> void:
	var game_scene: PackedScene = load("res://scenes/main/game.tscn")
	var game: Node2D = game_scene.instantiate()
	game.set_meta("auth_manager", auth)
	get_tree().root.add_child(game)
	queue_free()

# --- Leaderboard ---

func _show_leaderboard(data: Dictionary) -> void:
	var text := ""
	var season_entries: Array = data.get("season", {}).get("entries", [])
	var weekly_entries: Array = data.get("weekly", {}).get("entries", [])
	var community_entries: Array = data.get("community", {}).get("entries", [])
	var season_pot: String = data.get("season", {}).get("pot", "0")
	var weekly_pot: String = data.get("weekly", {}).get("pot", "0")
	var instant_pot: String = data.get("instant", {}).get("pot", "0")
	var community_pot: String = data.get("community", {}).get("pot", "0")
	var current_season: int = data.get("currentSeason", 1)
	var week_time: int = data.get("weekTimeLeft", 0)

	# Season board
	text += "--- Season Jackpot ---\n"
	if season_entries.size() > 0:
		for i in season_entries.size():
			var e: Dictionary = season_entries[i]
			text += "#%d  %s  %d pts\n" % [i + 1, _short_addr(str(e.get("player", ""))), e.get("score", 0)]
	else:
		text += "(No scores yet)\n"

	# Weekly board
	text += "\n--- Weekly Mini Jackpot ---\n"
	if weekly_entries.size() > 0:
		for i in weekly_entries.size():
			var e: Dictionary = weekly_entries[i]
			text += "#%d  %s  %d pts\n" % [i + 1, _short_addr(str(e.get("player", ""))), e.get("score", 0)]
	else:
		text += "(No scores yet)\n"

	# Community board
	text += "\n--- Community (Free Keys) ---\n"
	if community_entries.size() > 0:
		for i in community_entries.size():
			var e: Dictionary = community_entries[i]
			text += "#%d  %s  %d pts\n" % [i + 1, _short_addr(str(e.get("player", ""))), e.get("score", 0)]
	else:
		text += "(No scores yet)\n"

	# Pots info
	text += "\nSeason %d" % current_season
	if week_time > 0:
		text += "  |  Weekly reset: %dd %dh" % [week_time / 86400, (week_time % 86400) / 3600]

	# If no data at all, show mockup note
	if season_entries.size() == 0 and weekly_entries.size() == 0:
		text += "\n\n(Connect wallet & deploy API for live data)"

	_show_panel("Leaderboard", text)

func _short_addr(addr: String) -> String:
	if addr.length() > 10:
		return "%s...%s" % [addr.left(6), addr.right(4)]
	return addr

# --- Panels ---

func _show_panel(title_text: String, content_text: String) -> void:
	panel_title.text = title_text
	panel_content.text = content_text
	overlay.visible = true
	showing_panel = true

func _close_panel() -> void:
	overlay.visible = false
	if active_panel:
		active_panel.queue_free()
		active_panel = null
	showing_panel = false

func _close_active_panel() -> void:
	if active_panel:
		active_panel.queue_free()
		active_panel = null
	overlay.visible = false
	showing_panel = false

# --- Callbacks ---

func _on_auth_changed(mode: String, address: String) -> void:
	if mode == "wallet":
		status_label.text = "Connected: %s...%s" % [address.left(6), address.right(4)]
		wallet_btn.text = "Connected"
		wallet_btn.disabled = true
		daily_btn.visible = true
		buy_btn.visible = true
		guest_btn.text = "Begin Infection"
		auth.blockchain.can_claim_daily(func(can_claim: bool):
			daily_btn.disabled = not can_claim
			if not can_claim:
				daily_btn.text = "Daily Claimed"
		)
	else:
		status_label.text = "Guest Mode"

func _on_keys_updated(balance: int) -> void:
	if auth.mode == AuthManager.Mode.WALLET:
		keys_label.text = "Free: %d  |  Paid: %d  |  Total: %d" % [auth.free_keys, auth.paid_keys, balance]
	else:
		keys_label.text = "Keys: %d" % balance
