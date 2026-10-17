// Invoice reader: turns a photo or PDF of a supplier invoice into priced lines, then matches the lines to
// the kitchen's ingredients. Everything runs inside the app (Tesseract OCR + PDF.js, files in public/ocr),
// so invoices never leave the user's computer. Nothing is saved here: the Scan Invoice screen shows every
// line for the user to check before any price changes.

const OCR = '/ocr/'

// ---------- reading ----------

let worker = null
async function ocrWorker(onProgress) {
  if (!worker) {
    const { createWorker } = await import('tesseract.js')
    worker = await createWorker('eng', 1, {
      workerPath: new URL(OCR + 'worker.min.js', location.href).href,
      corePath: new URL(OCR, location.href).href,
      langPath: new URL(OCR, location.href).href,
      workerBlobURL: false,
      logger: (m) => { if (m.status === 'recognizing text' && onProgress) onProgress(m.progress) },
    })
    // Invoices are tables: keep the spaces between columns so prices stay on their line.
    await worker.setParameters({ preserve_interword_spaces: '1', tessedit_pageseg_mode: '6' })
  }
  return worker
}

// Photos come in large, shaded and noisy. Scale to a sensible size, go greyscale, then threshold each pixel
// against the brightness around it (adaptive threshold), so a shadow across the page doesn't hide the text.
async function prepareImage(blob) {
  const bmp = await createImageBitmap(blob)
  const scale = Math.min(2, Math.max(1, 2400 / Math.max(bmp.width, bmp.height)))
  const c = document.createElement('canvas')
  const w = c.width = Math.round(bmp.width * scale)
  const h = c.height = Math.round(bmp.height * scale)
  const g = c.getContext('2d')
  g.filter = 'blur(0.6px)'   // soften sensor noise before thresholding
  g.drawImage(bmp, 0, 0, w, h)
  g.filter = 'none'
  const img = g.getImageData(0, 0, w, h)
  const d = img.data
  const grey = new Float32Array(w * h)
  for (let i = 0, p = 0; p < grey.length; i += 4, p++) grey[p] = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]
  // Integral image: the mean of any window in constant time.
  const sum = new Float64Array((w + 1) * (h + 1))
  for (let y = 1; y <= h; y++) {
    let row = 0
    for (let x = 1; x <= w; x++) {
      row += grey[(y - 1) * w + (x - 1)]
      sum[y * (w + 1) + x] = sum[(y - 1) * (w + 1) + x] + row
    }
  }
  const r = Math.max(8, Math.round(Math.min(w, h) / 40))
  for (let y = 0; y < h; y++) {
    const y0 = Math.max(0, y - r), y1 = Math.min(h, y + r + 1)
    for (let x = 0; x < w; x++) {
      const x0 = Math.max(0, x - r), x1 = Math.min(w, x + r + 1)
      const mean = (sum[y1 * (w + 1) + x1] - sum[y0 * (w + 1) + x1] - sum[y1 * (w + 1) + x0] + sum[y0 * (w + 1) + x0]) / ((x1 - x0) * (y1 - y0))
      const v = grey[y * w + x] < mean * 0.85 ? 0 : 255
      const i = (y * w + x) * 4
      d[i] = d[i + 1] = d[i + 2] = v
    }
  }
  g.putImageData(img, 0, 0)
  return c
}

async function ocrImage(source, onProgress) {
  const w = await ocrWorker(onProgress)
  const { data } = await w.recognize(source)
  return data.text.split('\n')
}

// PDFs emailed by distributors usually carry real text: read it directly (exact, instant). Scanned PDFs
// have none, so those pages are drawn and read like a photo.
async function readPdf(file, onProgress) {
  const pdfjs = await import('pdfjs-dist')
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(OCR + 'pdf.worker.min.mjs', location.href).href
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise
  const lines = []
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p)
    const tc = await page.getTextContent()
    const text = pdfLines(tc.items)
    if (text.join('').replace(/\s/g, '').length > 40) {
      lines.push(...text)
    } else {
      const vp = page.getViewport({ scale: 2.5 })
      const c = document.createElement('canvas')
      c.width = vp.width; c.height = vp.height
      await page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise
      lines.push(...await ocrImage(c, (f) => onProgress && onProgress((p - 1 + f) / pdf.numPages)))
    }
    if (onProgress) onProgress(p / pdf.numPages)
  }
  return lines
}

// PDF text arrives as positioned pieces: group pieces sharing a baseline into a line, left to right.
export function pdfLines(items) {
  const rows = []
  for (const it of items) {
    if (!it.str || !it.str.trim()) continue
    const x = it.transform[4], y = it.transform[5]
    let row = rows.find((r) => Math.abs(r.y - y) < 3)
    if (!row) rows.push(row = { y, parts: [] })
    row.parts.push({ x, s: it.str })
  }
  rows.sort((a, b) => b.y - a.y)
  return rows.map((r) => r.parts.sort((a, b) => a.x - b.x).map((p) => p.s).join('   '))
}

export async function readInvoice(file, onProgress) {
  const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name || '')
  return isPdf ? readPdf(file, onProgress) : ocrImage(await prepareImage(file), onProgress)
}

// ---------- understanding the lines ----------

const SKIP = /\b(sub-?total|total|tax|vat|gst|balance|amount due|due date|invoice|inv\s?#|order\s?#|po\s?#|account|acct|date|page|phone|tel|fax|email|deposit|bottle dep|fuel|surcharge|delivery|freight|shipping|credit|payment|paid|change|cash|visa|mastercard|amex|thank|remit|terms|signature|received by|discount)\b/i
// Money: 12.50  1,234.50  $12.50  £3.10  (OCR sometimes reads the point as a comma: 12,50)
const MONEY = /(?:[$£€]\s?)?(\d{1,3}(?:,\d{3})+|\d+)[.,](\d{2})(?!\d)/g

export function parseLines(rawLines) {
  const out = []
  for (const raw of rawLines) {
    const line = raw.replace(/[|_]+/g, ' ').replace(/\s+/g, ' ').trim()
      .replace(/(\d)\s+[1Il][B8]S?\b(?![.,]\d)/g, '$1 LB')        // common photo misreads of "LB"
      .replace(/\bL8S?\b/g, 'LB')
    if (line.length < 5 || SKIP.test(line)) continue
    const prices = [...line.matchAll(MONEY)].map((m) => ({
      v: parseFloat(m[1].replace(/,/g, '') + '.' + m[2]), at: m.index, len: m[0].length,
    }))
    if (!prices.length) continue
    const desc = describe(line.slice(0, prices[0].at))
    if ((desc.match(/[a-z]/gi) || []).length < 3) continue

    // A leading whole number is usually the quantity shipped (cases or each).
    const q = line.match(/^(\d{1,3}(?:\.\d+)?)\s+(?:(?:cs|case|cases|ea|each|bx|box|bg|bag|pk|pkg)\b\.?\s*)?(?:[a-z]{0,3}\d{4,}\s+)?(?=[a-z])/i)
    const qty = q ? parseFloat(q[1]) : null
    let price, total = null
    if (prices.length >= 2) {
      price = prices[prices.length - 2].v
      total = prices[prices.length - 1].v
    } else if (qty && qty > 1) {
      total = prices[0].v
      price = Math.round((total / qty) * 100) / 100
    } else {
      price = prices[0].v
    }
    if (!(price > 0)) continue
    // Quantity x price should equal the line total; if it doesn't, a digit was probably misread.
    const doubt = prices.length >= 2 && qty > 0 && Math.abs(qty * price - total) > Math.max(0.05, total * 0.02)
    out.push({ raw: line, desc, qty, price, total, doubt, pack: packOf(line.slice(0, prices[0].at)) })
  }
  return out
}

// The item name: drop item codes, quantities and pack sizes so it reads like an ingredient.
function describe(s) {
  return s
    .replace(/^\s*\d{1,3}(?:\.\d+)?\s+(?:(?:cs|case|cases|ea|each|bx|box|bg|bag|pk|pkg)\b\.?\s*)?/i, '')
    .replace(/\b[A-Z]{0,3}\d{4,}\b/g, ' ')                               // item codes
    .replace(/[~*=«»“”"]+/g, ' ')                                       // scan specks
    .replace(/\b\d+\s*[/x]\s*\d+(?:\.\d+)?\s*[a-z#]*\b/gi, ' ')          // 6/#10, 4x5lb
    .replace(/\b\d+(?:\.\d+)?\s*(?:lbs?|#|kg|g|oz|fl ?oz|l|ltr|ml|gal|qt|ct|dz|doz|dozen|ea)\b\.?/gi, ' ')
    .replace(/\s+/g, ' ').replace(/^[\s\-:.,]+|[\s\-:.,]+$/g, '').trim()
}

// Pack size written on the line, e.g. "25 LB", "4x5lb", "6/1 gal", "15 DZ" -> { amount, unit }.
const UNIT_ALIASES = {
  lb: 'lb', lbs: 'lb', '#': 'lb', kg: 'kg', g: 'g', oz: 'oz', 'fl oz': 'fl oz', floz: 'fl oz',
  l: 'L', ltr: 'L', ml: 'ml', gal: 'gal', qt: 'qt', ct: 'each', ea: 'each', dz: 'dozen', doz: 'dozen', dozen: 'dozen',
}
export function packOf(s) {
  const unit = '(lbs?|#|kg|g|oz|fl ?oz|l|ltr|ml|gal|qt|ct|dz|doz|dozen|ea)'
  let m = s.match(new RegExp('\\b(\\d+)\\s*[/x]\\s*#?(\\d+(?:\\.\\d+)?)\\s*' + unit + '\\b', 'i'))
  if (m) return { amount: parseFloat(m[1]) * parseFloat(m[2]), unit: UNIT_ALIASES[m[3].toLowerCase()] || m[3] }
  m = s.match(new RegExp('\\b(\\d+(?:\\.\\d+)?)\\s*' + unit + '(?![a-z])', 'i'))
  if (m) return { amount: parseFloat(m[1]), unit: UNIT_ALIASES[m[2].toLowerCase()] || m[2] }
  return null
}

// How many of the ingredient's own unit are in a pack, when the units convert (lb to oz, kg to g...).
const TO_BASE = {
  g: ['g', 1], kg: ['g', 1000], oz: ['g', 28.3495], lb: ['g', 453.592],
  ml: ['ml', 1], L: ['ml', 1000], 'fl oz': ['ml', 29.5735], cup: ['ml', 236.588], pt: ['ml', 473.176], qt: ['ml', 946.353], gal: ['ml', 3785.41],
  each: ['each', 1], dozen: ['each', 12],
}
export function packInUnit(pack, unit) {
  if (!pack || !unit) return null
  const u = normUnit(unit)
  const a = TO_BASE[pack.unit], b = TO_BASE[u]
  if (!a || !b || a[0] !== b[0]) return null
  return Math.round((pack.amount * a[1] / b[1]) * 10000) / 10000
}
function normUnit(u) {
  const k = String(u).trim().toLowerCase()
  return ({ l: 'L', litre: 'L', liter: 'L', lbs: 'lb', pound: 'lb', ounce: 'oz', piece: 'each', pc: 'each', pcs: 'each', ea: 'each', doz: 'dozen' })[k] || (TO_BASE[k] ? k : (TO_BASE[u] ? u : k))
}

// ---------- matching lines to ingredients ----------

const STOP = new Set(['the', 'and', 'of', 'fresh', 'frozen', 'case', 'cs', 'bag', 'box', 'pack', 'pk', 'each', 'ea', 'ct', 'lb', 'lbs', 'oz', 'kg', 'gal', 'grade', 'premium', 'select', 'whole', 'bulk', 'usda', 'aa', 'a'])
export function tokens(s) {
  return String(s).toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/)
    .filter((t) => t.length > 1 && !STOP.has(t))
    .map((t) => t.replace(/(ies)$/, 'y').replace(/(oes|ses|xes)$/, (m) => m.slice(0, -2)).replace(/([^s])s$/, '$1'))
}
export function lineKey(s) { return tokens(s).join(' ') }

// Best ingredient for a line: a remembered match from an earlier invoice wins; otherwise word overlap,
// with a bonus when every word of the ingredient's name is on the line ("Butter" in "Butter Unsalted AA").
export function matchIngredient(desc, ingredients, aliases = []) {
  const key = lineKey(desc)
  const known = aliases.find((a) => a.line_key === key && ingredients.some((i) => i.id === a.ingredient_id))
  if (known) return { id: known.ingredient_id, score: 1, remembered: true, pack_size: known.pack_size }
  const lt = new Set(tokens(desc))
  let best = null
  for (const ing of ingredients) {
    const it = tokens(ing.name)
    if (!it.length) continue
    const hit = it.filter((t) => lt.has(t) || [...lt].some((l) => l.length > 3 && (l.startsWith(t) || t.startsWith(l)))).length
    if (!hit) continue
    let score = hit / Math.max(it.length, Math.min(lt.size, 3))
    if (hit === it.length) score += 0.25
    if (!best || score > best.score) best = { id: ing.id, score }
  }
  return best && best.score >= 0.5 ? best : null
}
