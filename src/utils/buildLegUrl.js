// ── V2 leg fetch URL builder ──────────────────────────────────
//
// Builds the fetch URL for a single leg's weather briefing.
// Uses FAA VFR day minimums, 6500ft default cruise altitude, and
// the current time as departure time.
//
// routeLeg: { from, to, waypoints: string[] }
//
// Returns a URL string pointing at the Apps Script endpoint.

import { CA_DATA } from '../data/config'

const DEFAULT_ALTITUDE_FT = 6500
const DEFAULT_FLIGHT_MODE = 'vfr_day'

export function buildLegUrl(routeLeg) {
  const { from, to, waypoints = [] } = routeLeg

  const url = new URL(CA_DATA.APPS_SCRIPT_URL)

  url.searchParams.set('departure',    from)
  url.searchParams.set('destination',  to)
  url.searchParams.set('altitude',     String(DEFAULT_ALTITUDE_FT))
  url.searchParams.set('flightMode',   DEFAULT_FLIGHT_MODE)
  url.searchParams.set('departureTime', new Date().toISOString())

  if (waypoints.length > 0) {
    url.searchParams.set('waypoints', waypoints.join(','))
  }

  // FAA minimums for VFR day
  const mins = CA_DATA.FAA_MINIMUMS[DEFAULT_FLIGHT_MODE]
  if (mins) {
    Object.entries(mins).forEach(([k, v]) => {
      if (v != null) url.searchParams.set(`min_${k}`, String(v))
    })
  }

  return url.toString()
}

// Build URLs for all legs from a routeLegs array ({ from, to, waypoints }[]).
// Returns string[].
export function buildAllLegUrls(routeLegs) {
  return routeLegs.map(buildLegUrl)
}
