import Database from '@tauri-apps/plugin-sql'

let db = null
let activeUser = 'guest'

// Scope the local database to the signed-in account, so each account keeps its own
// separate data on the same computer (e.g. a test account vs a real store). The auth
// store calls this whenever the signed-in user changes.
export function setActiveUser(userId) {
  const key = userId || 'guest'
  if (key === activeUser) return
  const wasLoaded = db !== null
  activeUser = key
  db = null
  // If a database was already in use, this is a live account switch — reload so every
  // store reinitialises against the new account's database with no leftover data.
  if (wasLoaded && typeof window !== 'undefined') window.location.reload()
}

export async function getDb() {
  if (!db) {
    db = await Database.load(`sqlite:mise_${activeUser}.db`)
    await initSchema()
  }
  return db
}

// All user-data tables, parents before children (so a restore inserts in FK-safe order).
const DATA_TABLES = [
  'ingredients', 'recipes', 'conversions',
  'recipe_ingredients', 'waste_log', 'price_history',
  'supplier_prices', 'recipe_components', 'recipe_sizes',
]

// Seed a realistic starter set so every feature has data to show (onboarding/demo).
// Appends; safe to skip if the user already has ingredients.
export async function seedSampleData() {
  const d = await getDb()
  const daysAgo = (n) => {
    const t = new Date(); t.setDate(t.getDate() - n)
    return t.toISOString().slice(0, 19).replace('T', ' ')
  }

  // name, unit, cost, supplier, allergens, on_hand, par, pack_label, pack_price, pack_size, yield_pct
  // Shows off pack sizing (buy big, use small) and yield (trim loss on almonds/strawberries).
  const ingredients = [
    ['Flour', 'kg', 0.80, "Baker's Supply", 'Gluten', 12, 10, '25kg sack', 20.00, 25, null],
    ['Butter', 'kg', 7.50, 'Dairy Co', 'Dairy', 4, 6, '1kg block', 7.50, 1, null],
    ['Eggs', 'dozen', 3.20, 'Farm Fresh', 'Egg', 8, 5, null, null, null, null],
    ['Sugar', 'kg', 1.10, "Baker's Supply", '', 20, 8, '10kg bag', 11.00, 10, null],
    ['Milk', 'L', 1.30, 'Dairy Co', 'Dairy', 6, 10, '2L carton', 2.60, 2, null],
    ['Dark chocolate', 'kg', 9.00, 'Sweet Imports', 'Dairy,Soy', 2, 3, null, null, null, null],
    ['Vanilla extract', 'L', 25.00, 'Sweet Imports', '', 1, 1, '1L bottle', 25.00, 1, null],
    ['Almonds', 'kg', 14.00, 'Sweet Imports', 'Tree nut', 1.5, 2, null, null, null, 85],
    ['Strawberries', 'kg', 6.00, 'Local farm/market', '', 2, 3, null, null, null, 90],
    ['Espresso beans', 'kg', 30.00, 'Local roaster', '', 3, 2, '1kg bag', 30.00, 1, null],
  ]
  const id = {}
  for (const [name, unit, cost, supplier, allergens, on_hand, par, pl, pp, ps, yld] of ingredients) {
    await d.execute(
      'INSERT INTO ingredients (name, unit, cost_per_unit, supplier, allergens, on_hand, par_level, pack_label, pack_price, pack_size, yield_pct) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [name, unit, cost, supplier, allergens || null, on_hand, par, pl, pp, ps, yld]
    )
    const [row] = await d.select('SELECT last_insert_rowid() AS id')
    id[name] = row.id
    await d.execute('INSERT INTO price_history (ingredient_id, cost_per_unit, recorded_at) VALUES (?, ?, ?)', [row.id, cost, daysAgo(0)])
  }
  // A few price trends (cost creep) so Price Trends + alerts have something to show.
  await d.execute('INSERT INTO price_history (ingredient_id, cost_per_unit, recorded_at) VALUES (?, ?, ?)', [id['Butter'], 6.50, daysAgo(60)])
  await d.execute('INSERT INTO price_history (ingredient_id, cost_per_unit, recorded_at) VALUES (?, ?, ?)', [id['Butter'], 7.00, daysAgo(30)])
  await d.execute('INSERT INTO price_history (ingredient_id, cost_per_unit, recorded_at) VALUES (?, ?, ?)', [id['Dark chocolate'], 8.00, daysAgo(45)])
  await d.execute('INSERT INTO price_history (ingredient_id, cost_per_unit, recorded_at) VALUES (?, ?, ?)', [id['Espresso beans'], 27.00, daysAgo(50)])

  // A couple of supplier price quotes so Compare Prices has something to compare.
  await d.execute('INSERT INTO supplier_prices (ingredient_id, supplier, price) VALUES (?, ?, ?)', [id['Flour'], 'Restaurant Depot', 0.92])
  await d.execute('INSERT INTO supplier_prices (ingredient_id, supplier, price) VALUES (?, ?, ?)', [id['Milk'], 'Local farm/market', 1.15])

  // name, category, servings, price, units, prep, notes, lines, components[[child, servingsUsed]], sizes[[label, mult, price]]
  // Buttercream is a SUB-RECIPE used by the cake + cupcakes; the Latte shows SIZES.
  const recipes = [
    ['Vanilla buttercream', 'Components', 20, null, null, 15, 'Beat butter smooth, add sugar, vanilla and a splash of milk.',
      [['Butter', 1, 'kg'], ['Sugar', 0.6, 'kg'], ['Vanilla extract', 0.03, 'L'], ['Milk', 0.1, 'L']], [], []],
    ['Chocolate cake', 'Cakes', 12, 6.00, 80, 45, 'Cream butter and sugar, fold in melted chocolate, bake 35 min at 180°C. Finish with buttercream.',
      [['Flour', 0.4, 'kg'], ['Butter', 0.25, 'kg'], ['Eggs', 0.33, 'dozen'], ['Sugar', 0.35, 'kg'], ['Dark chocolate', 0.2, 'kg']],
      [['Vanilla buttercream', 4]], []],
    ['Vanilla cupcakes', 'Pastry', 24, 3.50, 200, 40, 'Mix, pipe, bake 18 min at 175°C. Top with vanilla buttercream.',
      [['Flour', 0.5, 'kg'], ['Eggs', 0.5, 'dozen'], ['Sugar', 0.4, 'kg'], ['Milk', 0.3, 'L']],
      [['Vanilla buttercream', 8]], []],
    ['Almond croissant', 'Pastry', 10, 4.25, 60, 90, 'Laminated dough, almond cream, twice-baked.',
      [['Flour', 0.6, 'kg'], ['Butter', 0.4, 'kg'], ['Almonds', 0.2, 'kg'], ['Sugar', 0.15, 'kg']], [], []],
    ['Latte', 'Coffee & café', 1, 4.00, 300, 5, 'Double shot espresso, steamed milk.',
      [['Espresso beans', 0.018, 'kg'], ['Milk', 0.2, 'L']], [],
      [['Small', 0.8, 3.50], ['Regular', 1, 4.00], ['Large', 1.3, 4.75]]],
  ]
  const rid = {}
  for (const [name, category, servings, price, units, prep, notes, lines, components, sizes] of recipes) {
    await d.execute(
      'INSERT INTO recipes (name, category, servings, menu_price, units_sold, prep_minutes, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, category, servings, price, units, prep, notes]
    )
    const [row] = await d.select('SELECT last_insert_rowid() AS id')
    rid[name] = row.id
    for (const [ing, qty, unit] of lines) {
      await d.execute('INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit) VALUES (?, ?, ?, ?)', [row.id, id[ing], qty, unit])
    }
    for (const [child, used] of components) {
      await d.execute('INSERT INTO recipe_components (parent_recipe_id, child_recipe_id, servings_used) VALUES (?, ?, ?)', [row.id, rid[child], used])
    }
    for (const [label, mult, sprice] of sizes) {
      await d.execute('INSERT INTO recipe_sizes (recipe_id, label, portion_mult, menu_price) VALUES (?, ?, ?, ?)', [row.id, label, mult, sprice])
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

  // Sub-recipes / components: a recipe can include another recipe (e.g. buttercream,
  // simple syrup, base dough) by number of the child's servings used. Cost rolls up.
  await db.execute(`
    CREATE TABLE IF NOT EXISTS recipe_components (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      parent_recipe_id INTEGER NOT NULL,
      child_recipe_id INTEGER NOT NULL,
      servings_used REAL NOT NULL,
      FOREIGN KEY (parent_recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
      FOREIGN KEY (child_recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
    )
  `)

  // Sizes: sell one recipe at several sizes (Small/Large, 12oz/16oz, single/double scoop).
  // Each size is a portion multiplier of the base recipe with its own menu price.
  await db.execute(`
    CREATE TABLE IF NOT EXISTS recipe_sizes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recipe_id INTEGER NOT NULL,
      label TEXT NOT NULL,
      portion_mult REAL NOT NULL DEFAULT 1,
      menu_price REAL,
      FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
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
    'pack_price REAL',  // what you pay for one purchase pack (e.g. a 1kg bag)
    'pack_size REAL',   // how many usage-units (the `unit`) are in one pack
    'pack_label TEXT',  // optional human label for the pack, e.g. "1kg bag", "750ml bottle"
    'yield_pct REAL',   // usable % after trim/loss (null/100 = no loss); raises effective cost
  ]) {
    try { await db.execute(`ALTER TABLE ingredients ADD COLUMN ${col}`) } catch (_) { /* already exists */ }
  }

  // Supplier price comparison — multiple supplier quotes per ingredient (per the
  // ingredient's unit), so the user can compare and pick the best. The ingredient's own
  // cost_per_unit + supplier remain the "active" choice that drives recipe costing.
  await db.execute(`
    CREATE TABLE IF NOT EXISTS supplier_prices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ingredient_id INTEGER NOT NULL,
      supplier TEXT NOT NULL,
      price REAL NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE CASCADE
    )
  `)

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
