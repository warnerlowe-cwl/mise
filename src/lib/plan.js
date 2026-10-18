// What the free plan holds (17 Oct 2026). Premium and trial users have no limits. A free kitchen over a limit
// (for example after restoring a backup) keeps everything it has; it just cannot add more until it upgrades.
export const FREE_LIMITS = { recipes: 25, ingredients: 100 }

export class LimitError extends Error {
  constructor(kind, count, adding) {
    const limit = FREE_LIMITS[kind]
    super(`The free plan holds ${limit} ${kind}. You have ${count}.`)
    this.kind = kind
    this.count = count
    this.left = Math.max(0, limit - count)
    this.adding = adding
  }
}

// Throws a LimitError (after opening the upgrade dialog) if adding `adding` rows of `kind` goes over the free limit.
export async function checkRoom(db, kind, adding = 1) {
  const { useAuthStore } = await import('../stores/auth')
  if (useAuthStore().hasActiveLicense) return
  const [row] = await db.select(`SELECT COUNT(*) AS n FROM ${kind}`)
  const count = Number(row?.n || 0)
  if (count + adding <= FREE_LIMITS[kind]) return
  const err = new LimitError(kind, count, adding)
  const { useUpsellStore } = await import('../stores/upsell')
  useUpsellStore().limitHit(err)
  throw err
}
