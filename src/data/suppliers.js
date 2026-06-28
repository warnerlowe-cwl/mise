// Realistic foodservice suppliers by region. Names only — prices always come from the
// user's own invoices/quotes (no fake price data). Used to power supplier autocomplete
// and the supplier price-comparison feature. Users can always add their own local suppliers.

export const REGIONS = [
  { code: 'US', label: 'United States' },
  { code: 'UK', label: 'United Kingdom' },
  { code: 'CA', label: 'Canada' },
  { code: 'AU', label: 'Australia / NZ' },
]

export const SUPPLIERS_BY_REGION = {
  US: [
    'Sysco', 'US Foods', 'Gordon Food Service (GFS)', 'Performance Food Group',
    'Cheney Brothers', 'Ben E. Keith', 'Shamrock Foods', 'Restaurant Depot',
    'Costco Business Center', "Sam's Club", 'Baldor Specialty Foods', 'FreshPoint',
    'Dawn Foods', 'BakeMark', 'WebstaurantStore', 'Local roaster', 'Local dairy', 'Local farm/market',
  ],
  UK: [
    'Brakes', 'Bidfood', 'Booker', 'Bako', 'Country Range', 'JJ Food Service',
    'Makro', 'Costco UK', 'Pomona (produce)', 'Local mill', 'Local roaster',
    'Local dairy', 'Local farm/market',
  ],
  CA: [
    'Gordon Food Service (GFS)', 'Sysco Canada', 'Flanagan Foodservice', 'Sobeys / Safeway',
    'Costco Business Centre', 'Bridor', 'Pratts (PFG)', 'Local roaster', 'Local dairy',
    'Local farm/market',
  ],
  AU: [
    'Bidfood', 'PFD Food Services', 'Countrywide', 'NAFDA', 'Costco Australia',
    'Bingo Foodservice', 'Local roaster', 'Local dairy', 'Local farm/market',
  ],
}

const REGION_KEY = 'mise_region'

export function getRegion() {
  return localStorage.getItem(REGION_KEY) || 'US'
}

export function setRegion(code) {
  localStorage.setItem(REGION_KEY, code)
}

export function suppliersForRegion(code) {
  return SUPPLIERS_BY_REGION[code] || SUPPLIERS_BY_REGION.US
}
