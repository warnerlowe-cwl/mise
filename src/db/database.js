import Database from '@tauri-apps/plugin-sql'

let db = null

export async function getDb() {
  if (!db) {
    db = await Database.load('sqlite:mise.db')
    await initSchema()
  }
  return db
}

async function initSchema() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS ingredients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      unit TEXT NOT NULL,
      cost_per_unit REAL NOT NULL,
      supplier TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  await db.execute(`
    CREATE TABLE IF NOT EXISTS recipes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT,
      servings INTEGER NOT NULL DEFAULT 1,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  await db.execute(`
    CREATE TABLE IF NOT EXISTS recipe_ingredients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recipe_id INTEGER NOT NULL,
      ingredient_id INTEGER NOT NULL,
      quantity REAL NOT NULL,
      unit TEXT NOT NULL,
      FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
      FOREIGN KEY (ingredient_id) REFERENCES ingredients(id)
    )
  `)

  await db.execute(`
    CREATE TABLE IF NOT EXISTS waste_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ingredient_id INTEGER NOT NULL,
      quantity REAL NOT NULL,
      unit TEXT NOT NULL,
      reason TEXT,
      logged_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (ingredient_id) REFERENCES ingredients(id)
    )
  `)

  await db.execute(`
    CREATE TABLE IF NOT EXISTS conversions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_unit TEXT NOT NULL,
      to_unit TEXT NOT NULL,
      factor REAL NOT NULL,
      UNIQUE(from_unit, to_unit)
    )
  `)

  await db.execute(`
    INSERT OR IGNORE INTO conversions (from_unit, to_unit, factor) VALUES
      ('lb', 'oz', 16),
      ('oz', 'lb', 0.0625),
      ('kg', 'g', 1000),
      ('g', 'kg', 0.001),
      ('gal', 'qt', 4),
      ('qt', 'gal', 0.25),
      ('qt', 'pt', 2),
      ('pt', 'qt', 0.5),
      ('pt', 'cup', 2),
      ('cup', 'pt', 0.5),
      ('cup', 'fl oz', 8),
      ('fl oz', 'cup', 0.125),
      ('tbsp', 'tsp', 3),
      ('tsp', 'tbsp', 0.333),
      ('cup', 'tbsp', 16),
      ('tbsp', 'cup', 0.0625)
  `)

  // Migrations: add menu-pricing columns to existing recipes tables.
  // SQLite has no "ADD COLUMN IF NOT EXISTS", so ignore the duplicate-column error.
  for (const col of [
    'target_food_cost_pct REAL',
    'menu_price REAL',
  ]) {
    try { await db.execute(`ALTER TABLE recipes ADD COLUMN ${col}`) } catch (_) { /* already exists */ }
  }

  // Inventory & par levels live on the ingredient.
  for (const col of [
    'on_hand REAL',     // current quantity in stock (in the ingredient's unit)
    'par_level REAL',   // minimum to keep on hand; below this = reorder
  ]) {
    try { await db.execute(`ALTER TABLE ingredients ADD COLUMN ${col}`) } catch (_) { /* already exists */ }
  }

  // Supplier price history — one row each time an ingredient's cost changes, so we can
  // chart cost creep over time and flag the biggest movers.
  await db.execute(`
    CREATE TABLE IF NOT EXISTS price_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ingredient_id INTEGER NOT NULL,
      cost_per_unit REAL NOT NULL,
      recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE CASCADE
    )
  `)
  // Seed a baseline point for any existing ingredient with no history yet, so a price
  // tracked since day one still shows a starting price (dated from when it was created).
  await db.execute(`
    INSERT INTO price_history (ingredient_id, cost_per_unit, recorded_at)
    SELECT id, cost_per_unit, COALESCE(created_at, CURRENT_TIMESTAMP)
    FROM ingredients
    WHERE id NOT IN (SELECT DISTINCT ingredient_id FROM price_history)
  `)
}
