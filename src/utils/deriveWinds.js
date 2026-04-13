// ── Wind derivation utilities ─────────────────────────────────────
//
// Simplified wind triangle: headwind/tailwind component only.
// Full vector decomposition is Phase 3 (aircraft profile).

const DEG_TO_RAD = Math.PI / 180

// Interpolate winds-aloft data to a specific altitude.
// windsAloftData: array of { altitudeFt, direction, speed } objects,
//   sorted ascending by altitudeFt, as returned by Code.gs.
// Returns { direction, speed } at the requested altitude,
//   or null if windsAloftData is missing or empty.
export function interpolateWindsAtAltitude(windsAloftData, altitudeFt) {
  if (!windsAloftData?.length) return null

  const levels = [...windsAloftData].sort((a, b) => a.altitudeFt - b.altitudeFt)

  // Below all data: use lowest level
  if (altitudeFt <= levels[0].altitudeFt) return levels[0]

  // Above all data: use highest level
  if (altitudeFt >= levels[levels.length - 1].altitudeFt) return levels[levels.length - 1]

  // Linear interpolation between surrounding levels
  for (let i = 0; i < levels.length - 1; i++) {
    const lo = levels[i]
    const hi = levels[i + 1]
    if (altitudeFt >= lo.altitudeFt && altitudeFt <= hi.altitudeFt) {
      const t = (altitudeFt - lo.altitudeFt) / (hi.altitudeFt - lo.altitudeFt)

      // Interpolate direction using circular mean to avoid 359°/1° wraparound errors
      const loRad = lo.direction * DEG_TO_RAD
      const hiRad = hi.direction * DEG_TO_RAD
      const sinMean = (1 - t) * Math.sin(loRad) + t * Math.sin(hiRad)
      const cosMean = (1 - t) * Math.cos(loRad) + t * Math.cos(hiRad)
      const direction = ((Math.atan2(sinMean, cosMean) / DEG_TO_RAD) + 360) % 360

      const speed = lo.speed + t * (hi.speed - lo.speed)
      return { direction: Math.round(direction), speed: Math.round(speed) }
    }
  }

  return null
}

// Compute the headwind (+) or tailwind (-) component given:
//   windDir: wind direction in degrees true (direction wind is FROM)
//   windSpeed: wind speed in knots
//   legCourseDeg: aircraft track in degrees true
// Returns: positive = headwind, negative = tailwind (knots)
export function computeWindComponent(windDir, windSpeed, legCourseDeg) {
  if (windSpeed == null || windDir == null || legCourseDeg == null) return 0
  const angleDiff = ((windDir - legCourseDeg) + 360) % 360
  // cos(0°) = 1 (pure headwind), cos(180°) = -1 (pure tailwind)
  return Math.round(windSpeed * Math.cos(angleDiff * DEG_TO_RAD))
}

// Compute groundspeed from TAS and wind component.
//   windComponentKt: positive = headwind, negative = tailwind
// Returns groundspeed in knots (minimum 1kt to avoid division by zero).
export function computeGroundspeed(tasKt, windComponentKt) {
  if (tasKt == null) return null
  return Math.max(1, Math.round(tasKt - (windComponentKt ?? 0)))
}

// Compute estimated time enroute in minutes.
export function computeETE(distanceNm, groundspeedKt) {
  if (!distanceNm || !groundspeedKt || groundspeedKt <= 0) return null
  return Math.round((distanceNm / groundspeedKt) * 60)
}

// Compute estimated arrival time from departure time and ETE.
//   departureTimeISO: ISO 8601 UTC string
//   eteMin: estimated time enroute in minutes
// Returns ISO 8601 UTC string.
export function computeArrivalTime(departureTimeISO, eteMin) {
  if (!departureTimeISO || eteMin == null) return null
  const depMs = new Date(departureTimeISO).getTime()
  if (isNaN(depMs)) return null
  return new Date(depMs + eteMin * 60_000).toISOString()
}
