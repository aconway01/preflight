// ── PlanningMoment ────────────────────────────────────────────
//
// Planning surface shell. Shown in 'planning' and 'refreshing' states.
//
// Holds useLegState, initializes legs from weatherData + routeLegs,
// renders RouteSchematic, and exposes Refresh / Finalize actions.
//
// Props:
//   weatherData:  API response object
//   routeLegs:    { from, to, waypoints }[]  — route definitions
//   onRefresh:    () => void                 — re-fetch current route
//   onFinalize:   () => void                 — proceed to finalizing
//   routeModified:boolean                    — show Refresh button

import React, { useEffect, useRef, useState } from 'react'
import RouteSchematic from './RouteSchematic'
import { useLegState } from '../../hooks/useLegState'

export default function PlanningMoment({
  weatherData,
  routeLegs = [],
  onRefresh,
  onFinalize,
  routeModified = false,
}) {
  const legState = useLegState()
  const { legs, initLegs } = legState

  const [selectedNode, setSelectedNode] = useState(null)
  const [selectedLegId, setSelectedLegId] = useState(null)

  const initialized = useRef(false)

  // Initialize legs from weatherData on first mount or when weatherData changes
  useEffect(() => {
    if (!weatherData || !routeLegs.length) return
    const defs = routeLegs.map((rl, i) => ({
      departure:   rl.from,
      destination: rl.to,
      waypoints:   rl.waypoints ?? [],
      weather:     weatherData?.legs?.[i] ?? null,
    }))
    initLegs(defs)
    initialized.current = true
  }, [weatherData, routeLegs])

  function handleSelectNode(id) {
    setSelectedNode(prev => prev === id ? null : id)
    setSelectedLegId(null)
  }

  function handleSelectLeg(legId) {
    setSelectedLegId(prev => prev === legId ? null : legId)
    setSelectedNode(null)
  }

  const btnBase = {
    height:      '44px',
    background:  'var(--color-surface-2)',
    border:      '1px solid var(--color-border)',
    borderRadius:'8px',
    color:       'var(--color-text-primary)',
    fontFamily:  'var(--font-sans)',
    fontSize:    'var(--text-label)',
    cursor:      'pointer',
    fontWeight:  500,
  }

  return (
    <div
      className="flex-1 flex flex-col"
      style={{ maxWidth: '640px', margin: '0 auto', width: '100%', padding: '32px 24px 24px' }}
    >
      {/* Route schematic */}
      <RouteSchematic
        legs={legs}
        selectedNode={selectedNode}
        onSelectNode={handleSelectNode}
        onSelectLeg={handleSelectLeg}
      />

      {/* Selection info panel — placeholder */}
      {(selectedNode || selectedLegId) && (
        <div style={{
          marginTop:    '20px',
          padding:      '14px 16px',
          background:   'var(--color-surface)',
          border:       '1px solid var(--color-border)',
          borderRadius: '8px',
          fontFamily:   'var(--font-sans)',
          fontSize:     'var(--text-label)',
          color:        'var(--color-text-secondary)',
        }}>
          {selectedNode && <span>Selected: <strong style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)' }}>{selectedNode}</strong></span>}
          {selectedLegId && <span>Selected leg: <strong style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)' }}>{selectedLegId}</strong></span>}
          <span style={{ color: 'var(--color-text-muted)', marginLeft: '12px', fontSize: 'var(--text-small)' }}>
            (detail panel — Stage 3)
          </span>
        </div>
      )}

      {/* Action row */}
      <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
        {routeModified && (
          <button type="button" onClick={onRefresh} style={{ ...btnBase, flex: 1 }}>
            Refresh
          </button>
        )}
        <button
          type="button"
          onClick={onFinalize}
          style={{
            ...btnBase,
            flex:            1,
            background:      'var(--color-brand-gold)',
            border:          'none',
            color:           '#0D1120',
            fontWeight:      600,
          }}
        >
          Finalize
        </button>
      </div>

      {/* Stage placeholder */}
      <p style={{
        marginTop:  '40px',
        fontFamily: 'var(--font-sans)',
        fontSize:   'var(--text-small)',
        color:      'var(--color-text-muted)',
        textAlign:  'center',
      }}>
        Planning surface — Stage 3 panels go here
      </p>
    </div>
  )
}
