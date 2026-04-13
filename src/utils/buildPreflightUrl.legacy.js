import { CA_DATA } from '../data/config'

// Keys that map 1:1 to Code.gs threshold query param names.
const THRESHOLD_KEYS = [
  'minVis', 'minCeil', 'maxXwd', 'maxTotalWind',
  'maxGust', 'cautionDA', 'noGoDA', 'maxPressureAlt',
]

// Night param name: minVis → nightMinVis, cautionDA → nightCautionDA
function toNightKey(key) {
  return 'night' + key[0].toUpperCase() + key.slice(1)
}

// Day minimums mode for each flight mode.
function dayMode(flightMode) {
  if (flightMode === 'ifr')          return 'ifr'
  if (flightMode === 'student_solo') return 'solo_day'
  return 'vfr_day'
}

// Night minimums mode — null for IFR (no separate night mode).
function nightMode(flightMode) {
  if (flightMode === 'student_solo') return 'solo_night'
  if (flightMode === 'vfr')          return 'vfr_night'
  return null
}

// Most restrictive value for a field in a given mode.
// Personal minimums are hard-blocked at the floor in the UI, so personal
// (when set) is always at least as restrictive. Fall back to getFloor if
// personal is null; omit the param entirely if both are null.
function activeValue(mode, key, personalMins, getFloor) {
  const personal = personalMins?.[mode]?.[key]
  if (personal != null) return personal
  return getFloor(mode, key)  // returns null when no floor is defined
}

// Build the full Apps Script URL from the submit payload.
// payload = { route, flight, minimums }
// route   = useRouteState() return value
// flight  = useFlightState() return value
// minimums = useMinimumsState() return value
export function buildPreflightUrl({ route, flight, minimums }) {
  const url = new URL(CA_DATA.APPS_SCRIPT_URL)
  const p   = url.searchParams

  // ── Core params ─────────────────────────────────────────────
  // legs: "KDEP,KARR|KDEP2,KARR2"
  // Only intermediate stops (airports) appear here — waypoints (nav fixes) are excluded.
  const legsParam = route.legs.map(l => `${l.from},${l.to}`).join('|')
  p.set('legs', legsParam)

  // departureTimes: one UTC ISO string per leg — we share the single departure
  // time across all legs since per-leg ETEs are not yet captured.
  if (flight.depTimeUtc) {
    p.set('departureTimes', route.legs.map(() => flight.depTimeUtc).join('|'))
  }

  // flightRules
  p.set('flightRules', flight.isIFR ? 'IFR' : 'VFR')

  // cruiseAltitudes: same altitude for all legs (single cruise alt captured)
  if (flight.cruiseAlt) {
    p.set('cruiseAltitudes', route.legs.map(() => flight.cruiseAlt).join('|'))
  }

  // ── Day thresholds ───────────────────────────────────────────
  const dm = dayMode(flight.flightMode)
  for (const key of THRESHOLD_KEYS) {
    const val = activeValue(dm, key, minimums.personalMins, minimums.getFloor)
    if (val != null) p.set(key, val)
  }

  // ── Night thresholds (VFR and Student Solo only) ─────────────
  const nm = nightMode(flight.flightMode)
  if (nm) {
    for (const key of THRESHOLD_KEYS) {
      const val = activeValue(nm, key, minimums.personalMins, minimums.getFloor)
      if (val != null) p.set(toNightKey(key), val)
    }
  }

  return url.toString()
}
