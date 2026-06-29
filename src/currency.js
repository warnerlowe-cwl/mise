import { ref } from 'vue'
import { getRegion } from './data/suppliers'

// Currency symbol by region (UK uses £; US/CA/AU all use $). Reactive so the whole
// app re-renders money with the right symbol when the region changes.
const SYMBOLS = { US: '$', UK: '£', CA: '$', AU: '$' }

export const currency = ref(SYMBOLS[getRegion()] || '$')

export function applyRegionCurrency() {
  currency.value = SYMBOLS[getRegion()] || '$'
}
