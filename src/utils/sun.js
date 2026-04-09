// Lightweight NOAA solar algorithm — same math used in Code.gs.
// Returns { sunriseUtc, sunsetUtc } ISO strings for a given lat/lon/date,
// or null if no solar event (polar night / midnight sun).

function dateToJulian(date) {
  return date.getTime() / 86400000 + 2440587.5
}

function julianToDate(jd) {
  return new Date((jd - 2440587.5) * 86400000)
}

function calcSunriseSet(JD, lat, lon, isRise) {
  const D2R = Math.PI / 180
  const R2D = 180 / Math.PI

  const jdMidnight = Math.floor(JD + 0.5) - 0.5
  const T = (jdMidnight + 0.5 - 2451545.0) / 36525.0

  const L0 = (280.46646 + T * (36000.76983 + T * 0.0003032)) % 360
  const M  = 357.52911 + T * (35999.05029 - 0.0001537 * T)
  const C  = Math.sin(M * D2R) * (1.914602 - T * (0.004817 + 0.000014 * T))
           + Math.sin(2 * M * D2R) * (0.019993 - 0.000101 * T)
           + Math.sin(3 * M * D2R) * 0.000289

  const SunLon = L0 + C
  const omega  = 125.04 - 1934.136 * T
  const lambda = SunLon - 0.00569 - 0.00478 * Math.sin(omega * D2R)

  const epsilon0 = 23.0 + (26.0 + (21.448 - T * (46.8150 + T * (0.00059 - T * 0.001813))) / 60.0) / 60.0
  const epsilon  = epsilon0 + 0.00256 * Math.cos(omega * D2R)

  const dec = Math.asin(Math.sin(epsilon * D2R) * Math.sin(lambda * D2R)) * R2D

  const y   = Math.tan((epsilon / 2) * D2R) ** 2
  const eqT = 4 * R2D * (
      y * Math.sin(2 * L0 * D2R)
    - 2 * 0.016708634 * Math.sin(M * D2R)
    - 0.5 * y * y * Math.sin(4 * L0 * D2R)
    - 1.25 * 0.016708634 ** 2 * Math.sin(2 * M * D2R)
  )

  const cosHA = (Math.cos(90.833 * D2R) - Math.sin(lat * D2R) * Math.sin(dec * D2R))
              / (Math.cos(lat * D2R) * Math.cos(dec * D2R))
  if (cosHA < -1 || cosHA > 1) return null

  const HA = Math.acos(cosHA) * R2D
  const solarNoonMin = 720 - 4 * lon - eqT
  const eventMin     = isRise ? solarNoonMin - HA * 4 : solarNoonMin + HA * 4

  return jdMidnight + eventMin / 1440
}

export function getSunsetUtc(lat, lon, date) {
  try {
    const JD  = dateToJulian(date)
    const jd  = calcSunriseSet(JD, lat, lon, false)
    return jd ? julianToDate(jd).toISOString() : null
  } catch {
    return null
  }
}
