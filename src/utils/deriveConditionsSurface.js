// ── Conditions surface data builder ──────────────────────────────
//
// Builds a 2D array of cells [timeSlice][altitudeBand] for the
// ConditionsSurface D3 visualization.
//
// Time slices: every 30 minutes from departureTime to arrivalTime + 2hr buffer.
// Altitude slices: every 500ft from 0 to 18,000ft (37 levels).
//
// Data sources used (from weatherData as returned by Code.gs):
//   weatherData.reports[]         — METAR/TAF per station
//   weatherData.windsAloftLevels  — array of { altitudeFt, direction, speed }
//   weatherData.gairmets[]        — icing / turbulence bands (altitude bounds)
//   weatherData.freezingLevelFt   — single value or null
//
// Icing and turbulence are derived from G-AIRMET bounds —
// not a certified forecast product (see spec §17).

import { interpolateWindsAtAltitude } from './deriveWinds'

const ALTITUDE_MIN_FT  =     0
const ALTITUDE_MAX_FT  = 18_000
const ALTITUDE_STEP_FT =   500
const TIME_STEP_MIN    =    30  // minutes

// Flight category from ceiling and visibility
function deriveFlightCategory(ceilingFt, visibilitySM) {
  const c = ceilingFt  ?? Infinity
  const v = visibilitySM ?? Infinity

  if (c < 500  || v < 1)   return 'LIFR'
  if (c < 1000 || v < 3)   return 'IFR'
  if (c < 3000 || v < 5)   return 'MVFR'
  return 'VFR'
}

// Check whether a G-AIRMET covers a given altitude and time.
// gairmet.hazard values that indicate icing: 'ICE', 'ICING', 'FZRA', 'FZFG'
// gairmet.hazard values that indicate turbulence: 'TURB', 'TURBULENCE', 'LLWS'
function gairmetCoversAltitude(gairmet, altitudeFt) {
  const base = gairmet.baseFt ?? gairmet.base ?? null
  const top  = gairmet.topFt  ?? gairmet.top  ?? null
  if (base == null && top == null) return true  // no altitude bounds — assume full column
  if (base != null && altitudeFt < base) return false
  if (top  != null && altitudeFt > top)  return false
  return true
}

function gairmetCoversTime(gairmet, timeMs) {
  const from = gairmet.validFrom ? new Date(gairmet.validFrom).getTime() : -Infinity
  const to   = gairmet.validTo   ? new Date(gairmet.validTo).getTime()   :  Infinity
  return timeMs >= from && timeMs <= to
}

const ICING_HAZARDS = new Set(['ICE', 'ICING', 'FZRA', 'FZFG'])
const TURB_HAZARDS  = new Set(['TURB', 'TURBULENCE', 'LLWS', 'LOW LEVEL WIND SHEAR'])

// ── Main export ───────────────────────────────────────────────────

// buildSurfaceData(weatherData, departureTimeISO, arrivalTimeISO)
//
// Returns:
//   {
//     cells:     Cell[][],    — [timeIndex][altIndex], row-major
//     times:     Date[],      — time axis labels
//     altitudes: number[],    — altitude axis labels in ft
//   }
//
// Cell shape:
//   {
//     time:              Date,
//     altitudeFt:        number,
//     flightCategory:    'VFR'|'MVFR'|'IFR'|'LIFR',
//     ceilingFt:         number | null,
//     visibilitySM:      number | null,
//     icingPresent:      boolean,
//     turbulencePresent: boolean,
//     freezingLevelFt:   number | null,
//     windDir:           number | null,
//     windSpeed:         number | null,
//   }

export function buildSurfaceData(weatherData, departureTimeISO, arrivalTimeISO) {
  // Generate time axis
  const depMs     = new Date(departureTimeISO).getTime()
  const arrMs     = new Date(arrivalTimeISO).getTime()
  const bufferMs  = 2 * 60 * 60_000  // 2hr buffer past arrival
  const endMs     = arrMs + bufferMs
  const stepMs    = TIME_STEP_MIN * 60_000

  const times = []
  for (let t = depMs; t <= endMs; t += stepMs) {
    times.push(new Date(t))
  }

  // Generate altitude axis
  const altitudes = []
  for (let a = ALTITUDE_MIN_FT; a <= ALTITUDE_MAX_FT; a += ALTITUDE_STEP_FT) {
    altitudes.push(a)
  }

  // Extract relevant weather fields from the API response.
  // Code.gs returns data.legs[].reports[] and data.legs[].routeIntelligence.
  // For the surface, we use the departure station's conditions as the baseline
  // (the station most relevant to the enroute environment).
  const legs          = weatherData?.legs ?? []
  const firstReport   = legs[0]?.reports?.[0] ?? {}
  const analysis      = firstReport.departureAnalysis ?? firstReport.arrivalAnalysis ?? {}

  const ceilingFt     = analysis.ceilingFt     ?? null
  const visibilitySM  = analysis.visibility    ?? null

  const allIntel = legs.map(l => l.routeIntelligence).filter(Boolean)
  const gairmets = allIntel.flatMap(ri => ri.gairmets ?? [])

  // Freezing level: take the first available value across legs
  const freezingLevelFt = (() => {
    for (const leg of legs) {
      const ri = leg.routeIntelligence
      if (!ri) continue
      // freezingLevel may be a string like "8,200 ft MSL" or a number
      const raw = ri.windsAloft?.freezingLevel
      if (raw == null) continue
      if (typeof raw === 'number') return raw
      const match = String(raw).replace(/,/g, '').match(/(\d+)/)
      if (match) return parseInt(match[1], 10)
    }
    return null
  })()

  // Winds aloft levels (first available leg)
  const windsAloftData = allIntel[0]?.windsAloft?.levels ?? null

  // ── Build cell grid ───────────────────────────────────────────
  const cells = times.map(time => {
    const timeMs = time.getTime()
    const winds  = windsAloftData
      ? interpolateWindsAtAltitude(windsAloftData, 0)  // placeholder: altitude resolved per cell below
      : null

    return altitudes.map(altitudeFt => {
      // Flight category is based on ceiling/visibility from METAR —
      // above ceiling we derive it; below ceiling it's IMC.
      const fc = altitudeFt >= (ceilingFt ?? Infinity)
        ? deriveFlightCategory(ceilingFt, visibilitySM)
        : 'IFR'  // below ceiling = IMC

      // Icing: check G-AIRMETs with ice hazard codes
      const icingPresent = gairmets.some(g =>
        ICING_HAZARDS.has((g.hazard ?? '').toUpperCase().replace(/-/g, ' ')) &&
        gairmetCoversAltitude(g, altitudeFt) &&
        gairmetCoversTime(g, timeMs)
      )

      // Turbulence: check G-AIRMETs with turbulence hazard codes
      const turbulencePresent = gairmets.some(g =>
        TURB_HAZARDS.has((g.hazard ?? '').toUpperCase().replace(/-/g, ' ')) &&
        gairmetCoversAltitude(g, altitudeFt) &&
        gairmetCoversTime(g, timeMs)
      )

      // Winds at this specific altitude
      const windsAtAlt = windsAloftData
        ? interpolateWindsAtAltitude(windsAloftData, altitudeFt)
        : null

      return {
        time:              time,
        altitudeFt:        altitudeFt,
        flightCategory:    fc,
        ceilingFt:         ceilingFt,
        visibilitySM:      visibilitySM,
        icingPresent:      icingPresent,
        turbulencePresent: turbulencePresent,
        freezingLevelFt:   freezingLevelFt,
        windDir:           windsAtAlt?.direction ?? null,
        windSpeed:         windsAtAlt?.speed     ?? null,
      }
    })
  })

  return { cells, times, altitudes }
}
