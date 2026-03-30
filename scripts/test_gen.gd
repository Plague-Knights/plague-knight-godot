extends SceneTree

func _init() -> void:
	var symbols := {
		TownGenerator.Tile.EMPTY: ".",
		TownGenerator.Tile.ROAD: " ",
		TownGenerator.Tile.BUILDING: "#",
		TownGenerator.Tile.DOOR: "D",
		TownGenerator.Tile.INFECTED: "X",
		TownGenerator.Tile.TRAP: "!",
		TownGenerator.Tile.HAND_CART: "H",
		TownGenerator.Tile.VIRUS: "V",
		TownGenerator.Tile.PILL: "o",
		TownGenerator.Tile.HORSE_CART: ">",
	}
	for town in [1, 3, 5]:
		print("\n=== TOWN %d ===" % town)
		var gen := TownGenerator.new()
		gen.generate(town, 42 + town)
		# Stamp items
		for item in gen.item_spawns:
			var tile: int = {
				"trap": TownGenerator.Tile.TRAP,
				"hand_cart": TownGenerator.Tile.HAND_CART,
				"virus": TownGenerator.Tile.VIRUS,
				"pill": TownGenerator.Tile.PILL,
				"horse_cart": TownGenerator.Tile.HORSE_CART,
			}.get(item.type, -1)
			if tile >= 0:
				gen.grid[item.y][item.x] = tile
		for y in GameData.GRID_SIZE:
			var row := ""
			for x in GameData.GRID_SIZE:
				row += symbols.get(gen.grid[y][x], "?")
			print(row)
		print("Buildings: %d" % gen.building_data.size())
		for b in gen.building_data:
			print("  %s at (%d,%d) %dx%d" % [b.type, b.x, b.y, b.w, b.h])
		print("Entities: %d" % gen.entity_spawns.size())
		for e in gen.entity_spawns:
			print("  %s at (%d,%d)" % [e.type, e.x, e.y])
		print("Items: %d" % gen.item_spawns.size())
	quit()
