import Database from '@tauri-apps/plugin-sql'

let db = null

export async function getDb() {
  if (!db) {
    db = await Database.load('sqlite:mise.db')
    await initSchema()
  }
  return db
}

// All user-data tables, parents before children (so a restore inserts in FK-safe order).
const DATA_TABLES = [
  'ingredients', 'recipes', 'conversions',
  'recipe_ingredients', 'waste_log', 'price_history',
]

// Seed a realistic starter set so every feature has data to show (onboarding/demo).
// Appends; safe to skip if the user already has ingredients.
export async function seedSampleData() {
  const d = await getDb()
  const daysAgo = (n) => {
    const t = new Date(); t.setDate(t.getDate() - n)
    return t.toISOString().slice(0, 19).replace('T', ' ')
  }

  // name, unit, cost, supplier, allergens, on_hand, par_level
  const ingredients = [
    ['Flour', 'kg', 0.80, "Baker's Supply", 'Gluten', 12, 10],
    ['Butter', 'kg', 7.50, 'Dairy Co', 'Dairy', 4, 6],
    ['Eggs', 'dozen', 3.20, 'Farm Fresh', 'Egg', 8, 5],
    ['Sugar', 'kg', 1.10, "Baker's Supply", '', 20, 8],
    ['Milk', 'L', 1.30, 'Dairy Co', 'Dairy', 6, 10],
    ['Dark chocolate', 'kg', 9.00, 'Sweet Imports', 'Dairy,Soy', 2, 3],
    ['Vanilla extract', 'L', 25.00, 'Sweet Imports', '', 1, 1],
    ['Almonds', 'kg', 14.00, 'Sweet Imports', 'Tree nut', 1.5, 2],
  ]
  const id = {}
  for (const [name, unit, cost, supplier, allergens, on_hand, par_level] of ingredients) {
    await d.execute(
      'INSERT INTO ingredients (name, unit, cost_per_unit, supplier, allergens, on_hand, par_level) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, unit, cost, supplier, allergens || null, on_hand, par_level]
    )
    const [row] = await d.select('SELECT last_insert_rowid() AS id')
    id[name] = row.id
    await d.execute('INSERT INTO price_history (ingredient_id, cost_per_unit, recorded_at) VALUES (?, ?, ?)', [row.id, cost, daysAgo(0)])
  }
  // A couple of price trends (cost creep) so Price Trends + alerts have something to show.
  await d.execute('INSERT INTO price_history (ingredient_id, cost_per_unit, recorded_at) VALUES (?, ?, ?)', [id['Butter'], 6.50, daysAgo(60)])
  await d.execute('INSERT INTO price_history (ingredient_id, cost_per_unit, recorded_at) VALUES (?, ?, ?)', [id['Butter'], 7.00, daysAgo(30)])
  await d.execute('INSERT INTO price_history (ingredient_id, cost_per_unit, recorded_at) VALUES (?, ?, ?)', [id['Dark chocolate'], 8.00, daysAgo(45)])

  // name, category, servings, menu_price, units_sold, prep_minutes, notes, [ [ingredient, qty, unit], ... ]
  const recipes = [
    ['Chocolate cake', 'Cakes', 12, 6.00, 80, 45, 'Cream butter and sugar, fold in melted chocolate, bake 35 min at 180°C.',
      [['Flour', 0.4, 'kg'], ['Butter', 0.25, 'kg'], ['Eggs', 0.33, 'dozen'], ['Sugar', 0.35, 'kg'], ['Dark chocolate', 0.2, 'kg']]],
    ['Vanilla cupcakes', 'Pastry', 24, 3.50, 200, 40, 'Mix, pipe, bake 18 min at 175°C. Finish with vanilla buttercream.',
      [['Flour', 0.5, 'kg'], ['Butter', 0.3, 'kg'], ['Eggs', 0.5, 'dozen'], ['Sugar', 0.4, 'kg'], ['Vanilla extract', 0.02, 'L'], ['Milk', 0.3, 'L']]],
    ['Almond croissant', 'Pastry', 10, 4.25, 60, 90, 'Laminated dough, almond cream, twice-baked.',
      [['Flour', 0.6, 'kg'], ['Butter', 0.4, 'kg'], ['Almonds', 0.2, 'kg'], ['Sugar', 0.15, 'kg']]],
  ]
  for (const [name, category, servings, price, units, prep, notes, lines] of recipes) {
    await d.execute(
      'INSERT INTO recipes (name, category, servings, menu_price, units_sold, prep_minutes, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, category, servings, price, units, prep, notes]
    )
    const [row] = await d.select('SELECT last_insert_rowid() AS id')
    for (const [ing, qty, unit] of lines) {
      await d.execute(
        'INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit) VALUES (?, ?, ?, ?)',
        [row.id, id[ing], qty, unit]
      )
    }
  }
  return { ingredients: ingredients.length, recipes: recipes.length }
}

// Dump every table to a plain object — the full backup payload.
export async function exportAll() {
  const d = await getDb()
  const tables = {}
  for (const t of DATA_TABLES) {
    tables[t] = await d.select(`SELECT * FROM ${t}`)
  }
  return { app: 'mise', schema: 1, exported_at: new Date().toISOString(), tables }
}

// Replace all data with a backup payload. Ids are preserved so recipe↔ingredient
// links survive. Wipes children first, then reinserts parents-first.
export async function importAll(payload) {
  const d = await getDb()
  const tables = payload?.tables || {}
  for (const t of [...DATA_TABLES].reverse()) {
    await d.execute(`DELETE FROM ${t}`)
  }
  let inserted = 0
  for (const t of DATA_TABLES) {
    for (const row of tables[t] || []) {
      const cols = Object.keys(row)
      if (!cols.length) continue
      const placeholders = cols.map(() => '?').join(', ')
      await d.execute(
        `INSERT INTO ${t} (${cols.join(', ')}) VALUES (${placeholders})`,
        cols.map((c) => row[c])
      )
      inserted++
    }
  }
  return inserted
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
    'units_sold REAL',   // units sold in the period; drives menu-engineering popularity
    'prep_minutes REAL', // labor time per batch; drives plate-cost labor calc
  ]) {
    try { await db.execute(`ALTER TABLE recipes ADD COLUMN ${col}`) } catch (_) { /* already exists */ }
  }

  // Inventory & par levels live on the ingredient.
  for (const col of [
    'on_hand REAL',     // current quantity in stock (in the ingredient's unit)
    'par_level REAL',   // minimum to keep on hand; below this = reorder
    'allergens TEXT',   // comma-separated allergen tags; recipes inherit the union
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
