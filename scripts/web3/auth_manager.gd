## Manages authentication state — guest mode vs wallet mode
class_name AuthManager
extends RefCounted

signal auth_changed(mode: String, address: String)
signal keys_updated(balance: int)
signal run_started(run_id: String, paid: bool)
signal score_submitted(result: Dictionary)

enum Mode { GUEST, WALLET }

var mode: Mode = Mode.GUEST
var wallet_address: String = ""
var key_balance: int = 0
var free_keys: int = 0
var paid_keys: int = 0
var blockchain: Blockchain

func _init() -> void:
	blockchain = Blockchain.new()
	blockchain.wallet_connected.connect(_on_wallet_connected)
	blockchain.wallet_error.connect(_on_wallet_error)
	blockchain.transaction_complete.connect(_on_tx_complete)

# --- Auth ---

func start_guest() -> void:
	mode = Mode.GUEST
	wallet_address = ""
	auth_changed.emit("guest", "")

func connect_wallet() -> void:
	blockchain.connect_wallet()

# --- Keys ---

func can_start_run() -> bool:
	return key_balance > 0

func spend_key_for_run(callback: Callable) -> void:
	if mode == Mode.GUEST:
		if key_balance > 0:
			key_balance -= 1
			keys_updated.emit(key_balance)
			callback.call(true, "", false)
		else:
			callback.call(false, "", false)
		return
	# Wallet mode — API burns key and returns run session
	blockchain.transaction_complete.connect(func(method: String, result: Dictionary):
		if method == "startRun":
			_refresh_key_balance()
			var run_id: String = str(result.get("runId", ""))
			var paid: bool = bool(result.get("paidKey", false))
			run_started.emit(run_id, paid)
			callback.call(true, run_id, paid)
	, CONNECT_ONE_SHOT)
	blockchain.transaction_error.connect(func(method: String, msg: String):
		if method == "startRun":
			callback.call(false, "", false)
	, CONNECT_ONE_SHOT)
	blockchain.start_run()

func claim_daily(callback: Callable) -> void:
	if mode == Mode.GUEST:
		callback.call(true)
		return
	blockchain.transaction_complete.connect(func(method: String, _result: Dictionary):
		if method == "claimDailyKey":
			_refresh_key_balance()
			callback.call(true)
	, CONNECT_ONE_SHOT)
	blockchain.transaction_error.connect(func(method: String, _msg: String):
		if method == "claimDailyKey":
			callback.call(false)
	, CONNECT_ONE_SHOT)
	blockchain.claim_daily_key()

func buy_keys(amount: int, callback: Callable) -> void:
	if mode != Mode.WALLET:
		callback.call(false)
		return
	blockchain.transaction_complete.connect(func(method: String, _result: Dictionary):
		if method == "buyKeys":
			_refresh_key_balance()
			callback.call(true)
	, CONNECT_ONE_SHOT)
	blockchain.transaction_error.connect(func(method: String, _msg: String):
		if method == "buyKeys":
			callback.call(false)
	, CONNECT_ONE_SHOT)
	blockchain.buy_keys(amount)

# --- Scores ---

func submit_score(score: int, town: int, moves: int, integrity_hash: String) -> void:
	if mode == Mode.WALLET:
		blockchain.submit_score(score, town, moves, integrity_hash)

# --- Leaderboard ---

func get_leaderboard(callback: Callable) -> void:
	blockchain.get_leaderboard(callback)

func get_player_stats(callback: Callable) -> void:
	blockchain.get_player_stats(callback)

# --- Internal ---

func _refresh_key_balance() -> void:
	if mode == Mode.WALLET:
		blockchain.get_key_balance(func(bal: int):
			key_balance = bal
			keys_updated.emit(key_balance)
		)
		blockchain.get_free_keys(func(bal: int): free_keys = bal)
		blockchain.get_paid_keys(func(bal: int): paid_keys = bal)

func _on_wallet_connected(address: String) -> void:
	mode = Mode.WALLET
	wallet_address = address
	auth_changed.emit("wallet", address)
	_refresh_key_balance()

func _on_wallet_error(message: String) -> void:
	push_warning("Wallet error: %s" % message)
	start_guest()

func _on_tx_complete(method: String, _result: Dictionary) -> void:
	if method in ["startRun", "claimDailyKey", "buyKeys"]:
		_refresh_key_balance()
