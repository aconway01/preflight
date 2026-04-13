import { useState, useCallback } from 'react'
import {
  interpolateWindsAtAltitude,
  computeWindComponent,
  computeGroundspeed,
  computeETE,
  computeArrivalTime,
} from '../utils/deriveWinds'

function makeLeg(id, departure, destination, waypoints = []) {
  return {
    id,
    departure,
    destination,
    waypoints,

    // Pilot inputs
    departureTime:   null,   // ISO 8601 UTC string
    groundTimeMins:  0,
    cruiseAltitudeFt: null,
    tasKt:           null,

    // Fetch state
    status:     'idle',  // 'idle' | 'fetching' | 'ready' | 'error'
    fetchedAt:  null,

    // API response
    weather: null,

    // Derived
    windsAtAltitude:         null,
    windComponentKt:         null,
    groundspeedKt:           null,
    distanceNm:              null,
    estimatedTimeEnrouteMin: null,
    estimatedArrivalTime:    null,

    // Change detection
    planningFetchSnapshot: null,
    finalizationChanges:   [],
  }
}

let nextId = 1

export function useLegState() {
  const [legs, setLegs] = useState([])

  const addLeg = useCallback((departure, destination, waypoints = []) => {
    const id = `leg-${nextId++}`
    setLegs(prev => [...prev, makeLeg(id, departure, destination, waypoints)])
  }, [])

  const removeLeg = useCallback((id) => {
    setLegs(prev => prev.filter(l => l.id !== id))
  }, [])

  const updateLeg = useCallback((id, changes) => {
    setLegs(prev => prev.map(l => l.id === id ? { ...l, ...changes } : l))
  }, [])

  const setLegWeather = useCallback((id, weatherData) => {
    setLegs(prev => prev.map(l =>
      l.id === id
        ? { ...l, weather: weatherData, fetchedAt: new Date().toISOString() }
        : l
    ))
  }, [])

  const setLegStatus = useCallback((id, status) => {
    setLegs(prev => prev.map(l => l.id === id ? { ...l, status } : l))
  }, [])

  // Recompute derived values for leg[id], then cascade departure times forward.
  // Called after TAS, altitude, departure time, or winds change on any leg.
  const computeDerivedValues = useCallback((id) => {
    setLegs(prev => {
      const idx = prev.findIndex(l => l.id === id)
      if (idx === -1) return prev

      const next = [...prev]

      // Recompute the target leg
      const leg = { ...next[idx] }

      if (
        leg.weather?.windsAloft &&
        leg.cruiseAltitudeFt != null &&
        leg.tasKt != null &&
        leg.departureTime != null
      ) {
        const windsAt = interpolateWindsAtAltitude(
          leg.weather.windsAloft,
          leg.cruiseAltitudeFt
        )
        leg.windsAtAltitude = windsAt

        const courseDeg = leg.weather?.courseDeg ?? null
        if (windsAt && courseDeg != null) {
          leg.windComponentKt = computeWindComponent(
            windsAt.direction,
            windsAt.speed,
            courseDeg
          )
        } else {
          leg.windComponentKt = 0
        }

        leg.groundspeedKt = computeGroundspeed(leg.tasKt, leg.windComponentKt ?? 0)

        if (leg.distanceNm != null && leg.groundspeedKt > 0) {
          leg.estimatedTimeEnrouteMin = computeETE(leg.distanceNm, leg.groundspeedKt)
          leg.estimatedArrivalTime    = computeArrivalTime(
            leg.departureTime,
            leg.estimatedTimeEnrouteMin
          )
        }
      }

      next[idx] = leg

      // Cascade departure times to all subsequent legs
      for (let i = idx + 1; i < next.length; i++) {
        const prev_leg = next[i - 1]
        if (prev_leg.estimatedArrivalTime != null) {
          const prevArrivalMs  = new Date(prev_leg.estimatedArrivalTime).getTime()
          const groundTimeMs   = (next[i].groundTimeMins ?? 0) * 60_000
          next[i] = {
            ...next[i],
            departureTime: new Date(prevArrivalMs + groundTimeMs).toISOString(),
          }
          // Recursively recompute derived values for this leg using updated dept time
          // (inline, not recursive call, to avoid stale closure issues)
          const l = next[i]
          if (
            l.weather?.windsAloft &&
            l.cruiseAltitudeFt != null &&
            l.tasKt != null
          ) {
            const windsAt  = interpolateWindsAtAltitude(l.weather.windsAloft, l.cruiseAltitudeFt)
            const courseDeg = l.weather?.courseDeg ?? null
            const wc = (windsAt && courseDeg != null)
              ? computeWindComponent(windsAt.direction, windsAt.speed, courseDeg)
              : 0
            const gs = computeGroundspeed(l.tasKt, wc)
            const ete = (l.distanceNm != null && gs > 0)
              ? computeETE(l.distanceNm, gs)
              : null
            const arr = (ete != null)
              ? computeArrivalTime(next[i].departureTime, ete)
              : null
            next[i] = {
              ...next[i],
              windsAtAltitude:         windsAt,
              windComponentKt:         wc,
              groundspeedKt:           gs,
              estimatedTimeEnrouteMin: ete,
              estimatedArrivalTime:    arr,
            }
          }
        }
      }

      return next
    })
  }, [])

  // Bulk-initialize legs from an array of definitions.
  // legDefinitions: { departure, destination, waypoints, weather }[]
  // Each leg is set to status 'ready' if weather is present, else 'idle'.
  const initLegs = useCallback((legDefinitions) => {
    const initialized = legDefinitions.map(def => {
      const id  = `leg-${nextId++}`
      const leg = makeLeg(id, def.departure, def.destination, def.waypoints ?? [])
      if (def.weather) {
        leg.weather   = def.weather
        leg.status    = 'ready'
        leg.fetchedAt = new Date().toISOString()
      }
      return leg
    })
    setLegs(initialized)
  }, [])

  const getLegByIndex = useCallback((n) => {
    return legs[n] ?? null
  }, [legs])

  return {
    legs,
    addLeg,
    removeLeg,
    updateLeg,
    setLegWeather,
    setLegStatus,
    computeDerivedValues,
    initLegs,
    getLegByIndex,
  }
}
