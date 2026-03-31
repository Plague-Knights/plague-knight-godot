## Web3 blockchain interface — calls JavaScript bridge via JavaScriptBridge
## Player wallet signs: connectWallet, claimDailyKey, buyKeys
## API server signs: startRun, submitScore
## Free reads: getKeyBalance, canClaimDaily, getLeaderboard, getPlayerStats
class_name Blockchain
extends RefCounted

signal wallet_connected(address: String)
signal wallet_error(message: String)
signal transaction_complete(method: String, result: Dictionary)
signal transaction_error(method: String, message: String)

var connected_address: String = ""
var is_web: bool = false
var _bridge: JavaScriptObject = null
var _kept_callbacks: Array = []

# Run session from API (provably fair)
var current_run_id: String = ""
var current_run_paid: bool = false

func _init() -> void:
	is_web = OS.has_feature("web")
	if is_web:
		_bridge = JavaScriptBridge.get_interface("PlagueWeb3")

func _keep_cb(cb: JavaScriptObject) -> JavaScriptObject:
	_kept_callbacks.append(cb)
	return cb

# --- Wallet Connect (browser) ---

func connect_wallet() -> void:
	if not is_web or _bridge == null:
		wallet_error.emit("Not running in browser")
		return
	var cb := _keep_cb(JavaScriptBridge.create_callback(_on_connect_result))
	_bridge.connectWallet(cb)

func _on_connect_result(args: Array) -> void:
	var result := _parse_json(args)
	if result.has("error"):
		wallet_error.emit(str(result.error))
	else:
		connected_address = str(result.get("address", ""))
		wallet_connected.emit(connected_address)

# --- Reads (free RPC calls) ---

func get_key_balance(callback: Callable) -> void:
	if not is_web or _bridge == null:
		callback.call(0)
		return
	var cb := _keep_cb(JavaScriptBridge.create_callback(func(args: Array):
		callback.call(int(str(args[0])) if args.size() > 0 else 0)
	))
	_bridge.getKeyBalance(cb)

func get_free_keys(callback: Callable) -> void:
	if not is_web or _bridge == null:
		callback.call(0)
		return
	var cb := _keep_cb(JavaScriptBridge.create_callback(func(args: Array):
		callback.call(int(str(args[0])) if args.size() > 0 else 0)
	))
	_bridge.getFreeKeys(cb)

func get_paid_keys(callback: Callable) -> void:
	if not is_web or _bridge == null:
		callback.call(0)
		return
	var cb := _keep_cb(JavaScriptBridge.create_callback(func(args: Array):
		callback.call(int(str(args[0])) if args.size() > 0 else 0)
	))
	_bridge.getPaidKeys(cb)

func can_claim_daily(callback: Callable) -> void:
	if not is_web or _bridge == null:
		callback.call(false)
		return
	var cb := _keep_cb(JavaScriptBridge.create_callback(func(args: Array):
		callback.call(str(args[0]) == "true" if args.size() > 0 else false)
	))
	_bridge.canClaimDaily(cb)

# --- Player Wallet Signs (claimDaily, buyKeys) ---

func claim_daily_key() -> void:
	_call_bridge_tx("claimDailyKey", func(br: JavaScriptObject, cb: JavaScriptObject):
		br.claimDailyKey(cb)
	)

func buy_keys(amount: int) -> void:
	if not is_web or _bridge == null:
		transaction_error.emit("buyKeys", "Not connected")
		return
	var cb := _keep_cb(JavaScriptBridge.create_callback(func(args: Array):
		_handle_tx_result("buyKeys", str(args[0]) if args.size() > 0 else "{}")
	))
	_bridge.buyKeys(amount, cb)

# --- API Calls (server signs) ---

func start_run() -> void:
	if not is_web or _bridge == null:
		transaction_error.emit("startRun", "Not connected")
		return
	var cb := _keep_cb(JavaScriptBridge.create_callback(func(args: Array):
		var result := _parse_json(args)
		if result.has("error"):
			transaction_error.emit("startRun", str(result.error))
		else:
			current_run_id = str(result.get("runId", ""))
			current_run_paid = bool(result.get("paidKey", false))
			transaction_complete.emit("startRun", result)
	))
	_bridge.startRun(cb)

func submit_score(score: int, town: int, moves: int, integrity_hash: String) -> void:
	if not is_web or _bridge == null:
		transaction_error.emit("submitScore", "Not connected")
		return
	var cb := _keep_cb(JavaScriptBridge.create_callback(func(args: Array):
		var result := _parse_json(args)
		if result.has("error"):
			transaction_error.emit("submitScore", str(result.error))
		else:
			transaction_complete.emit("submitScore", result)
	))
	_bridge.submitScore(score, town, moves, integrity_hash, current_run_id, cb)

# --- Leaderboard + Stats (via API) ---

func get_leaderboard(callback: Callable) -> void:
	if not is_web or _bridge == null:
		callback.call({})
		return
	var cb := _keep_cb(JavaScriptBridge.create_callback(func(args: Array):
		var data := _parse_json(args)
		callback.call(data)
	))
	_bridge.getLeaderboard(cb)

func get_player_stats(callback: Callable) -> void:
	if not is_web or _bridge == null:
		callback.call({})
		return
	var cb := _keep_cb(JavaScriptBridge.create_callback(func(args: Array):
		var data := _parse_json(args)
		callback.call(data)
	))
	_bridge.getPlayerStats(cb)

# --- Helpers ---

func _call_bridge_tx(method: String, call_fn: Callable) -> void:
	if not is_web or _bridge == null:
		transaction_error.emit(method, "Not connected")
		return
	var cb := _keep_cb(JavaScriptBridge.create_callback(func(args: Array):
		_handle_tx_result(method, str(args[0]) if args.size() > 0 else "{}")
	))
	call_fn.call(_bridge, cb)

func _handle_tx_result(method: String, json_str: String) -> void:
	var result = JSON.parse_string(json_str)
	if result == null or result is not Dictionary:
		transaction_error.emit(method, "Failed to parse response")
		return
	if result.has("error"):
		transaction_error.emit(method, str(result.error))
	else:
		transaction_complete.emit(method, result)

func _parse_json(args: Array) -> Dictionary:
	if args.size() == 0:
		return {"error": "Empty response"}
	var result = JSON.parse_string(str(args[0]))
	if result == null or result is not Dictionary:
		return {"error": "Failed to parse"}
	return result
