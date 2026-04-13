import { useState, useCallback } from 'react'

// ── Identifier helpers ────────────────────────────────────────────

// Normalize a typed identifier to 4-char ICAO format.
// 3-char US domestic identifiers (FAA format) get a K prefix: IAD → KIAD.
// 4-char identifiers (KIAD, EGLL, CYYZ, PANC) are returned unchanged.
// Anything else is returned as-is for the caller to handle.
export function normalizeId(val) {
  const v = (val || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (v.length === 3 && !v.startsWith('K')) return 'K' + v
  return v
}

// A committed identifier is valid when it is exactly 4 alphanumeric chars
// (post-normalization).
export function isValidId(val) {
  return /^[A-Z0-9]{4}$/.test((val || '').toUpperCase().trim())
}

// Character-level cleanup for keystroke handling.
// Normalization happens on blur, not on every keystroke.
function sanitize(v) {
  return (v || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5)
}

// ── Hook ─────────────────────────────────────────────────────────

export function useRouteState() {
  const [departure,    setDepartureRaw]   = useState('')
  const [destination,  setDestinationRaw] = useState('')
  const [stops,        setStops]          = useState([])    // string[]
  const [legWaypoints, setLegWaypoints]   = useState([[]])  // string[][]

  // Tracks how the pilot committed the route.
  const [entryMode, setEntryMode] = useState(null)  // null | 'guided' | 'route'

  const setDeparture   = useCallback(v => setDepartureRaw(sanitize(v)),   [])
  const setDestination = useCallback(v => setDestinationRaw(sanitize(v)), [])

  const departureValid   = isValidId(departure)
  const destinationValid = isValidId(destination)
  const routeReady       = departureValid && destinationValid

  // All valid nodes in order: departure, valid stops, destination
  const validStops = stops.filter(isValidId)
  const nodes      = routeReady
    ? [departure, ...validStops, destination]
    : []

  // Per-leg from/to/waypoints — used by the planning surface and fetch URL builder
  const legs = nodes.slice(0, -1).map((from, i) => ({
    from,
    to:        nodes[i + 1],
    waypoints: legWaypoints[i] ?? [],
  }))

  // ── Stop management ───────────────────────────────────────────
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

  // Insert an airport stop into a leg, splitting its waypoints at wptSplitAt.
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

  // ── Waypoint management ───────────────────────────────────────
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

  // ── Route string parsing ──────────────────────────────────────
  // Parse "KIAD MAPAX KOKV WITCH KFDK KIAD" into departure/stops/waypoints.
  // 3–4 char tokens → airports; 5-char tokens → waypoints on the preceding leg.
  const parseRouteString = useCallback((str) => {
    const parts = str.trim().toUpperCase().split(/\s+/).filter(Boolean)
    if (parts.length < 2) return false

    const dep  = normalizeId(sanitize(parts[0]))
    const dest = normalizeId(sanitize(parts[parts.length - 1]))
    const mid  = parts.slice(1, -1)

    const newStops       = []
    const newLegWpts     = [[]]
    let   currentLegWpts = newLegWpts[0]

    for (const token of mid) {
      const clean = token.replace(/[^A-Z0-9]/g, '')
      if (clean.length === 5) {
        currentLegWpts.push(clean)
      } else {
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

  // ── Derived route strings ─────────────────────────────────────
  // EFB-format DCT string: "KIAD DCT MAPAX DCT KOKV DCT KFDK DCT KIAD"
  const routeString = legs.length > 0
    ? legs.map((leg, i) => {
        const wpts = leg.waypoints.length > 0
          ? ' DCT ' + leg.waypoints.join(' DCT ') + ' DCT '
          : ' DCT '
        return (i === 0 ? leg.from : '') + wpts + leg.to
      }).join(' ')
    : ''

  // Human-readable space-separated: "KIAD MAPAX KOKV KFDK KIAD"
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
    normalizeId,
    routeString, editableRouteString,
    entryMode, setEntryMode,
  }
}
