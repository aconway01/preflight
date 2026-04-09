import { useState, useCallback, useMemo } from 'react'
import { getSunsetUtc } from '../utils/solar'


export const FLIGHT_MODES = [
  { id: 'vfr',          label: 'VFR' },
  { id: 'ifr',          label: 'IFR' },
  { id: 'student_solo', label: 'Student Solo' },
]

// VFR altitude cap per FAR 91.159 (VFR cruising rules top out at 17,500ft MSL)
export const VFR_ALT_CAP = 17500

function nowLocalString() {
  const d   = new Date()
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function utcDisplay(localDatetimeStr) {
  if (!localDatetimeStr) return ''
  try {
    const d   = new Date(localDatetimeStr)
    const pad = n => String(n).padStart(2, '0')
    return `${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}Z`
  } catch {
    return ''
  }
}

export function useFlightState() {
  const [flightMode,    setFlightMode]    = useState(null)   // 'vfr' | 'ifr' | 'student_solo'
  const [depTimeLocal,  setDepTimeLocal]  = useState(nowLocalString)
  const [cruiseAlt,     setCruiseAltRaw]  = useState('')
  const [ackChecked,    setAckChecked]    = useState(false)
  const [picName,       setPicName]       = useState('')

  // Student Solo endorsement fields
  const [soloEndorseDate,    setSoloEndorseDate]    = useState('')
  const [soloEndorseInstr,   setSoloEndorseInstr]   = useState('')
  const [soloNightEndDate,   setSoloNightEndDate]   = useState('')
  const [soloNightEndInstr,  setSoloNightEndInstr]  = useState('')

  const isIFR       = flightMode === 'ifr'
  const isVfrType   = flightMode === 'vfr' || flightMode === 'student_solo'
  const isSolo      = flightMode === 'student_solo'
  const altCap      = isVfrType ? VFR_ALT_CAP : null

  const setCruiseAlt = useCallback((raw) => {
    const digits = String(raw).replace(/\D/g, '')
    if (!digits) { setCruiseAltRaw(''); return }
    const n = parseInt(digits, 10)
    setCruiseAltRaw(altCap ? String(Math.min(n, altCap)) : String(n))
  }, [altCap])

  const depTimeUtc = useMemo(() => {
    if (!depTimeLocal) return null
    try { return new Date(depTimeLocal).toISOString() } catch { return null }
  }, [depTimeLocal])

  const depTimeUtcLabel = useMemo(() => utcDisplay(depTimeLocal), [depTimeLocal])

  // Derive day/night from departure time using an Eastern US proxy (39°N, -77°W).
  // Returns true (night), false (day), or null (unable to compute).
  // Longitude is required — omitting it defaults to 0° (Greenwich) and gives
  // incorrect sunset times for US locations. -77° approximates the DC/Virginia area
  // until actual airport coordinates are available from AVWX.
  //
  // Architecture note: this is departure-only for now. When per-leg flight times
  // are added, each leg's arrival will be checked separately against that airport's
  // local sunset. soloIsNight (below) is the UNION of all night conditions — so
  // adding per-leg arrivals only requires updating soloIsNight, not this value.
  const departureIsNight = useMemo(() => {
    if (!depTimeLocal) return null
    try {
      // Parse "YYYY-MM-DDTHH:mm" explicitly as local time.
      // new Date(string) without a timezone suffix has implementation-defined
      // behaviour in some environments — explicit Date(y,m,d,h,min) is unambiguous.
      const [dateStr, timeStr] = depTimeLocal.split('T')
      if (!dateStr || !timeStr) return null
      const [yr, mo, dy] = dateStr.split('-').map(Number)
      const [hr, mn]     = timeStr.split(':').map(Number)
      const depDate = new Date(yr, mo - 1, dy, hr, mn)

      // Pass only the local calendar date (midnight) — not the full datetime — so
      // solarEventJD floors to the correct UTC midnight for that date.
      // Passing the full depDate risks crossing a UTC date boundary for late-evening
      // departures (e.g. 10 PM EDT = next calendar day in UTC), which would cause
      // the solar calculation to use tomorrow's sunset.
      const sunsetUtcStr = getSunsetUtc(39, -77, new Date(yr, mo - 1, dy))
      if (!sunsetUtcStr) return null

      return depDate.getTime() >= new Date(sunsetUtcStr).getTime()
    } catch {
      return null
    }
  }, [depTimeLocal])

  // soloIsNight: true if ANY point in the flight has night conditions.
  // Currently only departure-based. When per-leg arrival times are added,
  // this becomes: departureIsNight || anyLegArrivalIsNight.
  // FAR 61.93 endorsement is required whenever this is true.
  const soloIsNight = departureIsNight

  const flightModeSet = flightMode !== null
  const depTimeSet    = !!depTimeLocal
  const cruiseAltSet  = cruiseAlt !== '' && parseInt(cruiseAlt, 10) > 0

  const allRequired = flightModeSet && depTimeSet && cruiseAltSet
  const canSubmit   = allRequired && ackChecked && picName.trim().length > 0

  return {
    flightMode, setFlightMode, isIFR, isVfrType, isSolo, altCap,
    depTimeLocal, setDepTimeLocal, depTimeUtc, depTimeUtcLabel,
    cruiseAlt, setCruiseAlt,
    ackChecked, setAckChecked,
    picName, setPicName,
    // Solo — day/night derived, not pilot-selected
    departureIsNight, soloIsNight,
    soloEndorseDate,   setSoloEndorseDate,
    soloEndorseInstr,  setSoloEndorseInstr,
    soloNightEndDate,  setSoloNightEndDate,
    soloNightEndInstr, setSoloNightEndInstr,
    flightModeSet, depTimeSet, cruiseAltSet,
    allRequired, canSubmit,
  }
}
