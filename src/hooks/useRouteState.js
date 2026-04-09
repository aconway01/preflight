import { useState, useCallback } from 'react'

// Normalize a typed identifier to 4-char ICAO format.
// 3-char identifiers that don't start with K are US domestic (FAA format) —
// prepend K to produce the ICAO equivalent (IAD → KIAD, CVG → KCVG).
// 4-char identifiers (KIAD, EGLL, CYYZ, PANC) are returned unchanged.
// Anything else is returned as-is for the caller to flag as invalid.
export function normalizeId(val) {
  const v = (val || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (v.length === 3 && !v.startsWith('K')) return 'K' + v
  return v
}

// A committed identifier is valid when it is exactly 4 alphanumeric chars
// (post-normalization). All stored IDs in the route state are in this form.
export function isValidId(val) {
  return /^[A-Z0-9]{4}$/.test((val || '').toUpperCase().trim())
}

// Character-level cleanup for keystroke handling — no normalization here.
// Normalization happens on blur in AirportInput, not on every keystroke.
function sanitize(v) {
  return (v || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5)
}

export function useRouteState() {
  const [departure,    setDepartureRaw]   = useState('')
  const [destination,  setDestinationRaw] = useState('')
  const [stops,        setStops]          = useState([])   // string[]
  const [legWaypoints, setLegWaypoints]   = useState([[]])  // string[][]

  // Tracks how the pilot committed the route — used to choose the editing surface.
  // Set explicitly by the caller (IntentMoment) rather than auto-set here, so that
  // the "Edit route" panel in guided mode can re-parse without switching display.
  const [entryMode, setEntryMode] = useState(null)  // null | 'guided' | 'route'

  const setDeparture   = useCallback(v => setDepartureRaw(sanitize(v)),   [])
  const setDestination = useCallback(v => setDestinationRaw(sanitize(v)), [])

  const departureValid   = isValidId(departure)
  const destinationValid = isValidId(destination)
  const routeReady       = departureValid && destinationValid

  // Only valid (normalized) stops appear as nodes in the schematic
  const validStops = stops.filter(isValidId)
  const nodes      = routeReady
    ? [departure, ...validStops, destination]
    : []

  const legs = nodes.slice(0, -1).map((from, i) => ({
    from,
    to:        nodes[i + 1],
    waypoints: legWaypoints[i] ?? [],
  }))

  const addStop = useCallback(() => {
    setStops(prev => [...prev, ''])
    setLegWaypoints(prev => [...prev, []])
  }, [])

  const updateStop = useCallback((idx, val) => {
    setStops(prev => prev.map((s, i) => i === idx ? sanitize(val) : s))
  }, [])

  const removeStop = useCallback((idx) => {
    setStops(prev => {
      const next = prev.filter((_, i) => i !== idx)
      const newLegCount = next.filter(isValidId).length + 1
      setLegWaypoints(wp => {
        const trimmed = wp.slice(0, newLegCount)
        while (trimmed.length < newLegCount) trimmed.push([])
        return trimmed
      })
      return next
    })
  }, [])

  // Insert an airport stop into the middle of leg at legIndex.
  // wptSplitAt: the slot index within that leg's waypoint list where the split occurs.
  // Waypoints before wptSplitAt stay on the first sub-leg; waypoints from wptSplitAt
  // onward move to the second sub-leg. If omitted, the new leg gets no waypoints.
  const addStopAtLeg = useCallback((legIndex, id, wptSplitAt) => {
    setStops(prev => {
      const next = [...prev]
      next.splice(legIndex, 0, id)
      return next
    })
    setLegWaypoints(prev => {
      const next = [...prev]
      if (wptSplitAt != null) {
        const current = next[legIndex] ?? []
        next[legIndex] = current.slice(0, wptSplitAt)
        next.splice(legIndex + 1, 0, current.slice(wptSplitAt))
      } else {
        next.splice(legIndex + 1, 0, [])
      }
      return next
    })
  }, [])

  // Insert a waypoint at a specific position within a leg's waypoint list.
  // insertAt=0 puts it before all existing waypoints; insertAt=wpts.length appends.
  const insertWaypoint = useCallback((legIndex, insertAt, id) => {
    setLegWaypoints(prev => prev.map((wpts, i) => {
      if (i !== legIndex) return wpts
      const next = [...wpts]
      next.splice(insertAt, 0, id)
      return next
    }))
  }, [])

  const removeWaypoint = useCallback((legIndex, wptIdx) => {
    setLegWaypoints(prev => prev.map((wpts, i) =>
      i === legIndex ? wpts.filter((_, j) => j !== wptIdx) : wpts
    ))
  }, [])

  // Parse a full route string into departure, stops, and per-leg waypoints.
  // Airport tokens (3–4 chars) are normalized to 4-char ICAO and become stops.
  // Nav fix tokens (5 chars, e.g. MAPAX, WITCH) are assigned as waypoints on
  // the leg they precede — the leg from the last airport to the next airport.
  //
  // Example: "KIAD MAPAX KOKV WITCH KFDK KIAD"
  //   departure = KIAD, stops = [KOKV, KFDK], dest = KIAD
  //   leg 0 waypoints = [MAPAX], leg 1 waypoints = [WITCH], leg 2 waypoints = []
  const parseRouteString = useCallback((str) => {
    const parts = str.trim().toUpperCase().split(/\s+/).filter(Boolean)
    if (parts.length < 2) return false

    const dep  = normalizeId(sanitize(parts[0]))
    const dest = normalizeId(sanitize(parts[parts.length - 1]))
    const mid  = parts.slice(1, -1)

    const newStops       = []
    const newLegWpts     = [[]]   // leg 0 waypoints (dep → first stop or dest)
    let   currentLegWpts = newLegWpts[0]

    for (const token of mid) {
      const clean = token.replace(/[^A-Z0-9]/g, '')
      if (clean.length === 5) {
        // Nav fix — belongs to the current leg
        currentLegWpts.push(clean)
      } else {
        // Airport — becomes a stop; start a new leg
        newStops.push(normalizeId(sanitize(clean)))
        newLegWpts.push([])
        currentLegWpts = newLegWpts[newLegWpts.length - 1]
      }
    }

    setDepartureRaw(dep)
    setDestinationRaw(dest)
    setStops(newStops)
    setLegWaypoints(newLegWpts)
    return true
  }, [])

  // EFB route string — ICAO identifiers in DCT format for copy/paste
  const routeString = legs.length > 0
    ? legs.map((leg, i) => {
        const wpts = leg.waypoints.length > 0 ? ' DCT ' + leg.waypoints.join(' DCT ') + ' DCT ' : ' DCT '
        return (i === 0 ? leg.from : '') + wpts + leg.to
      }).join(' ')
    : ''

  // Editable route string — simple space-separated: "KIAD MAPAX KOKV KFDK KIAD"
  // Always derived from current legs state so it stays in sync with schematic edits.
  const editableRouteString = legs.length > 0
    ? [legs[0].from, ...legs.flatMap(l => [...l.waypoints, l.to])].join(' ')
    : ''

  return {
    departure, setDeparture,
    destination, setDestination,
    stops, addStop, addStopAtLeg, updateStop, removeStop,
    legs,
    insertWaypoint, removeWaypoint,
    departureValid, destinationValid, routeReady,
    parseRouteString,
    routeString, editableRouteString,
    entryMode, setEntryMode,
  }
}
