// NOAA Solar Position Algorithm
// Reference: https://gml.noaa.gov/grad/solcalc/calcdetails.html
// Accurate to within minutes for 1901–2099 at non-polar latitudes.
//
// lat  — decimal degrees north (positive = north)
// lon  — decimal degrees east (positive = east, negative = west)
// date — any JavaScript Date; only the calendar date is used for the event time

const D2R = Math.PI / 180
const R2D = 180 / Math.PI

function toJulian(date) {
  return date.getTime() / 86400000 + 2440587.5
}

function fromJulian(jd) {
  return new Date((jd - 2440587.5) * 86400000)
}

// Returns the Julian Day of sunrise (isRise=true) or sunset (isRise=false),
// or null when no event occurs (polar night / midnight sun).
function solarEventJD(lat, lon, date, isRise) {
  const JD = toJulian(date)

  // Midnight UTC for the calendar date represented by JD
  const jdMidnight = Math.floor(JD + 0.5) - 0.5

  // Julian centuries from J2000.0
  const T = (jdMidnight + 0.5 - 2451545.0) / 36525.0

  // Geometric mean longitude of the Sun (°)
  const L0 = (280.46646 + T * (36000.76983 + T * 0.0003032)) % 360

  // Geometric mean anomaly of the Sun (°)
  const M = 357.52911 + T * (35999.05029 - 0.0001537 * T)

  // Equation of the center
  const C =
    Math.sin(M * D2R) * (1.914602 - T * (0.004817 + 0.000014 * T)) +
    Math.sin(2 * M * D2R) * (0.019993 - 0.000101 * T) +
    Math.sin(3 * M * D2R) * 0.000289

  // Sun's apparent longitude (corrected for nutation and aberration)
  const omega  = 125.04 - 1934.136 * T
  const lambda = (L0 + C) - 0.00569 - 0.00478 * Math.sin(omega * D2R)

  // Mean obliquity of the ecliptic (°), corrected
  const epsilon0 =
    23.0 +
    (26.0 + (21.448 - T * (46.8150 + T * (0.00059 - T * 0.001813))) / 60.0) / 60.0
  const epsilon = epsilon0 + 0.00256 * Math.cos(omega * D2R)

  // Sun's declination (°)
  const dec = Math.asin(Math.sin(epsilon * D2R) * Math.sin(lambda * D2R)) * R2D

  // Equation of time (minutes)
  const y   = Math.tan((epsilon / 2.0) * D2R) ** 2
  const eqT = 4 * R2D * (
    y * Math.sin(2 * L0 * D2R) -
    2 * 0.016708634 * Math.sin(M * D2R) -
    0.5 * y * y * Math.sin(4 * L0 * D2R) -
    1.25 * 0.016708634 ** 2 * Math.sin(2 * M * D2R)
  )

  // Hour angle at the horizon (90.833° = 90° + 0.833° for refraction + solar disc)
  const cosHA =
    (Math.cos(90.833 * D2R) - Math.sin(lat * D2R) * Math.sin(dec * D2R)) /
    (Math.cos(lat * D2R) * Math.cos(dec * D2R))

  if (cosHA < -1 || cosHA > 1) return null  // polar night or midnight sun

  const HA = Math.acos(cosHA) * R2D

  // Solar noon (minutes from UTC midnight)
  const solarNoon = 720 - 4 * lon - eqT

  // Event time (minutes from UTC midnight)
  const eventMin = isRise ? solarNoon - HA * 4 : solarNoon + HA * 4

  return jdMidnight + eventMin / 1440
}

// Returns sunrise time as a UTC ISO string, or null (polar event / error).
export function getSunriseUtc(lat, lon, date) {
  try {
    const jd = solarEventJD(lat, lon, date, true)
    return jd != null ? fromJulian(jd).toISOString() : null
  } catch {
    return null
  }
}

// Returns sunset time as a UTC ISO string, or null (polar event / error).
export function getSunsetUtc(lat, lon, date) {
  try {
    const jd = solarEventJD(lat, lon, date, false)
    return jd != null ? fromJulian(jd).toISOString() : null
  } catch {
    return null
  }
}
