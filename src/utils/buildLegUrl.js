// ── V2 leg fetch URL builder ──────────────────────────────────
//
// Builds the fetch URL for a single leg using the parameter names
// Code.gs (Apps Script) expects — same as buildPreflightUrl.legacy.js
// but scoped to one leg at a time.
//
// Code.gs required params:
//   legs           — "KDEP,KARR" (single leg; multi-leg would be pipe-separated)
//   departureTimes — UTC ISO string
//   flightRules    — "VFR" | "IFR"
//   cruiseAltitudes— ft as string
//   minVis, minCeil, maxXwd, maxTotalWind, maxGust, cautionDA, noGoDA (day)
//   nightMin*      — same keys prefixed "night" (night threshold values)
//
// routeLeg: { from, to, waypoints: string[] }
// Returns a URL string.

import { CA_DATA } from '../data/config'

const DEFAULT_ALTITUDE_FT = 6500

// Minimums to send for VFR day (FAA floor values)
const DAY_THRESHOLD_KEYS = [
  'minVis', 'minCeil', 'maxXwd', 'maxTotalWind',
  'maxGust', 'cautionDA', 'noGoDA', 'maxPressureAlt',
]

// Night key transform: minVis → nightMinVis
function toNightKey(key) {
  return 'night' + key[0].toUpperCase() + key.slice(1)
}

export function buildLegUrl(routeLeg) {
  const { from, to } = routeLeg

  const url = new URL(CA_DATA.APPS_SCRIPT_URL)
  const p   = url.searchParams

  // Single leg in the format Code.gs expects
  p.set('legs',            `${from},${to}`)
  p.set('departureTimes',  new Date().toISOString())
  p.set('flightRules',     'VFR')
  p.set('cruiseAltitudes', String(DEFAULT_ALTITUDE_FT))

  // Day minimums — FAA VFR day floor
  const dayMins = CA_DATA.FAA_MINIMUMS?.vfr_day ?? {}
  for (const key of DAY_THRESHOLD_KEYS) {
    const val = dayMins[key]
    if (val != null) p.set(key, String(val))
  }

  // Night minimums — FAA VFR night floor (Code.gs applies these for night arrivals)
  const nightMins = CA_DATA.FAA_MINIMUMS?.vfr_night ?? {}
  for (const key of DAY_THRESHOLD_KEYS) {
    const val = nightMins[key]
    if (val != null) p.set(toNightKey(key), String(val))
  }

  return url.toString()
}

// Build URLs for all legs. Returns string[].
export function buildAllLegUrls(routeLegs) {
  return routeLegs.map(buildLegUrl)
}
