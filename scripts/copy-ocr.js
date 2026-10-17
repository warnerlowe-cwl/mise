// Copies the invoice reader's files (Tesseract OCR + PDF.js workers + English text model) into public/ocr,
// so they ship inside the app and invoices are read on the user's own computer, offline.
// Runs before every dev and build; public/ocr is not committed.
import { copyFileSync, mkdirSync, existsSync } from 'node:fs'

const out = 'public/ocr'
mkdirSync(out, { recursive: true })
const files = [
  ['node_modules/tesseract.js/dist/worker.min.js', 'worker.min.js'],
  ['node_modules/tesseract.js-core/tesseract-core-lstm.wasm.js', 'tesseract-core-lstm.wasm.js'],
  ['node_modules/tesseract.js-core/tesseract-core-simd-lstm.wasm.js', 'tesseract-core-simd-lstm.wasm.js'],
  ['node_modules/@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz', 'eng.traineddata.gz'],
  ['node_modules/pdfjs-dist/build/pdf.worker.min.mjs', 'pdf.worker.min.mjs'],
]
for (const [from, to] of files) {
  if (!existsSync(from)) throw new Error(`missing ${from}: run npm install`)
  copyFileSync(from, `${out}/${to}`)
}
console.log(`invoice reader files copied to ${out}`)
