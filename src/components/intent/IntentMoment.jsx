import React, { useRef, useEffect, useState } from 'react'
import { useRouteState }           from '../../hooks/useRouteState'
import { useFlightState }          from '../../hooks/useFlightState'
import { useOccupantsState }       from '../../hooks/useOccupantsState'
import { useMinimumsState }        from '../../hooks/useMinimumsState'
import { usePilotReadinessState }  from '../../hooks/usePilotReadinessState'
import AirportInput                from './AirportInput'
import RouteSchematic              from './RouteSchematic'
import RouteStringInput            from './RouteStringInput'
import EditableRouteString         from './EditableRouteString'
import FlightModeSelect            from './FlightModeSelect'
import SoloFields                  from './SoloFields'
import DepartureTime               from './DepartureTime'
import CruiseAltitude              from './CruiseAltitude'
import Acknowledgement             from './Acknowledgement'
import OccupantsSection            from './OccupantsSection'
import MinimumsSection             from './MinimumsSection'
import PilotReadinessSection       from './PilotReadinessSection'

export default function IntentMoment({ onSubmit }) {
  const route     = useRouteState()
  const flight    = useFlightState()
  const occupants = useOccupantsState()
  const minimums  = useMinimumsState()
  const readiness = usePilotReadinessState()

  const destRef = useRef(null)

  // Pre-commit: which input mode the pilot has chosen.
  // 'guided' = individual airport fields (default)
  // 'route'  = full route string input
  const [activeMode, setActiveMode] = useState('guided')

  // Post-commit: which surface is shown above the schematic.
  // Initialized to 'guided'; set to 'route' when pilot commits via route string.
  // Freely switchable via tab bar at any time after commit.
  const [displayMode, setDisplayMode] = useState('guided')

  // Auto-focus destination once departure is committed in guided mode.
  useEffect(() => {
    if (activeMode === 'guided' && route.departureValid && !route.destination && destRef.current) {
      destRef.current.focus()
    }
  }, [route.departureValid, activeMode]) // eslint-disable-line react-hooks/exhaustive-deps

  // When a valid route is committed via guided entry, record entryMode and set displayMode.
  useEffect(() => {
    if (route.routeReady && activeMode === 'guided' && route.entryMode == null) {
      route.setEntryMode('guided')
      setDisplayMode('guided')
    }
  }, [route.routeReady, activeMode, route.entryMode]) // eslint-disable-line react-hooks/exhaustive-deps

  // Called when the pilot commits a route string from the MODE-SELECTION input (pre-commit).
  function handleParseRouteString(str) {
    route.parseRouteString(str)
    route.setEntryMode('route')
    setActiveMode('guided')   // return pre-commit selector to default
    setDisplayMode('route')   // show route string surface post-commit
  }

  // Called when the pilot edits via the always-visible EditableRouteString in route-string tab.
  function handleRouteStringUpdate(str) {
    route.parseRouteString(str)
    // displayMode stays 'route'
  }

  function handleSubmit() {
    if (!flight.canSubmit) return
    onSubmit?.({ route, flight, minimums, readiness, occupants })
  }

  // Progressive disclosure gates
  const showFlightMode = route.routeReady
  const showTimingAlt  = showFlightMode && flight.flightModeSet
  const showAck        = showTimingAlt && flight.cruiseAltSet

  const tabStyle = (active) => ({
    flex:            '1',
    height:          '36px',
    backgroundColor: active ? 'var(--color-surface-2)' : 'transparent',
    color:           active ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
    border:          'none',
    cursor:          'pointer',
    fontSize:        'var(--text-label)',
    fontFamily:      'var(--font-sans)',
    fontWeight:      active ? '500' : '400',
    transition:      'background-color 0.15s, color 0.15s',
  })

  return (
    <div className="flex-1 flex flex-col px-4">

      {/* Top spacer */}
      <div className="flex-1" style={{ minHeight: '24px', maxHeight: '80px' }} />

      <div className="flex flex-col items-center gap-6 py-8 w-full max-w-lg mx-auto">

        {/* ── Heading ── */}
        <h2
          className="text-display font-semibold text-center"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Where are you flying?
        </h2>

        {/* ══════════════════════════════════════════
            PRE-COMMIT: mode selection
            ══════════════════════════════════════════ */}

        {!route.routeReady && (
          activeMode === 'route' ? (

            /* Mode 2 — route string input */
            <div className="w-full">
              <RouteStringInput
                onParse={handleParseRouteString}
                onDismiss={() => setActiveMode('guided')}
              />
            </div>

          ) : (

            /* Mode 1 — guided airport fields */
            <div className="flex flex-col gap-4 w-full">
              <AirportInput
                value={route.departure}
                onChange={route.setDeparture}
                placeholder="Departure"
                autoFocus={!route.departure && !route.destination}
              />

              {route.departureValid && (
                <AirportInput
                  value={route.destination}
                  onChange={route.setDestination}
                  placeholder="Destination"
                  inputRef={destRef}
                />
              )}

              {/* Route string option */}
              <div className="flex flex-col gap-3 w-full pt-1">
                <div className="flex items-center gap-3">
                  <div className="flex-1" style={{ height: '1px', backgroundColor: 'var(--color-border)' }} />
                  <span className="text-small" style={{ color: 'var(--color-text-muted)' }}>or</span>
                  <div className="flex-1" style={{ height: '1px', backgroundColor: 'var(--color-border)' }} />
                </div>
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => setActiveMode('route')}
                    className="w-full rounded-lg text-label font-medium text-left"
                    style={{
                      padding:         '10px 16px',
                      backgroundColor: 'transparent',
                      border:          '1px solid var(--color-border)',
                      color:           'var(--color-text-secondary)',
                      cursor:          'pointer',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-text-muted)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)' }}
                  >
                    Enter full route string
                  </button>
                  <p className="text-small px-1" style={{ color: 'var(--color-text-muted)' }}>
                    e.g. KIAD MAPAX KOKV KFDK KIAD — waypoints included
                  </p>
                </div>
              </div>
            </div>
          )
        )}

        {/* ══════════════════════════════════════════
            POST-COMMIT: tab bar + display surface
            ══════════════════════════════════════════ */}

        {route.routeReady && (
          <>
            {/* Tab bar */}
            <div
              className="w-full rounded-lg overflow-hidden"
              style={{ border: '1px solid var(--color-border)' }}
            >
              <div style={{ display: 'flex' }}>
                <button
                  onClick={() => setDisplayMode('guided')}
                  style={tabStyle(displayMode === 'guided')}
                >
                  Depart / Arrive
                </button>
                <button
                  onClick={() => setDisplayMode('route')}
                  style={tabStyle(displayMode === 'route')}
                >
                  Route String
                </button>
              </div>
            </div>

            {/* Content: airport fields OR editable route string */}
            {displayMode === 'guided' ? (
              <div className="flex flex-col gap-4 w-full">
                <AirportInput
                  value={route.departure}
                  onChange={route.setDeparture}
                  placeholder="Departure"
                />
                <AirportInput
                  value={route.destination}
                  onChange={route.setDestination}
                  placeholder="Destination"
                  inputRef={destRef}
                />
              </div>
            ) : (
              <EditableRouteString
                derivedValue={route.editableRouteString}
                onCommit={handleRouteStringUpdate}
              />
            )}

            {/* Schematic — always visible after commit */}
            <div className="w-full">
              <RouteSchematic
                legs={route.legs}
                onInsertWaypoint={route.insertWaypoint}
                onRemoveWaypoint={route.removeWaypoint}
                onAddStop={route.addStopAtLeg}
                onRemoveStop={route.removeStop}
              />
            </div>

          </>
        )}

        {/* ── Flight mode ── */}
        {showFlightMode && (
          <FlightModeSelect
            value={flight.flightMode}
            onChange={flight.setFlightMode}
          />
        )}

        {/* ── Departure time + cruise altitude ── */}
        {showTimingAlt && (
          <>
            <DepartureTime
              value={flight.depTimeLocal}
              onChange={flight.setDepTimeLocal}
              utcLabel={flight.depTimeUtcLabel}
            />

            {flight.isSolo && flight.departureIsNight !== null && (
              <div className="w-full" style={{ marginTop: '-20px' }}>
                <span className="text-small" style={{ color: 'var(--color-text-muted)' }}>
                  {flight.departureIsNight
                    ? 'Night conditions at departure'
                    : 'Day conditions at departure'}
                </span>
              </div>
            )}

            <CruiseAltitude
              value={flight.cruiseAlt}
              onChange={flight.setCruiseAlt}
              isIFR={flight.isIFR}
              altCap={flight.altCap}
            />
          </>
        )}

        {/* ── Student Solo: endorsement fields ── */}
        {showTimingAlt && flight.isSolo && (
          <SoloFields
            soloIsNight={flight.soloIsNight}
            soloEndorseDate={flight.soloEndorseDate}
            onSoloEndorseDate={flight.setSoloEndorseDate}
            soloEndorseInstr={flight.soloEndorseInstr}
            onSoloEndorseInstr={flight.setSoloEndorseInstr}
            soloNightEndDate={flight.soloNightEndDate}
            onSoloNightEndDate={flight.setSoloNightEndDate}
            soloNightEndInstr={flight.soloNightEndInstr}
            onSoloNightEndInstr={flight.setSoloNightEndInstr}
          />
        )}

        {/* ── Acknowledgement + Run Preflight Check ── */}
        {showAck && (
          <Acknowledgement
            checked={flight.ackChecked}
            onToggle={() => flight.setAckChecked(v => !v)}
            picName={flight.picName}
            onPicNameChange={flight.setPicName}
            onSubmit={handleSubmit}
            canSubmit={flight.canSubmit}
          />
        )}

        {/* ── Optional context — below the submit block, never required ── */}
        {showAck && (
          <>
            <div style={{ width: '100%', height: '1px', backgroundColor: 'var(--color-border)' }} />
            <OccupantsSection
              occupants={occupants.occupants}
              onAdd={occupants.addOccupant}
              onUpdate={occupants.updateOccupant}
              onRemove={occupants.removeOccupant}
            />
            <MinimumsSection
              flightMode={flight.flightMode}
              departureIsNight={flight.departureIsNight}
              schoolMinsEnabled={minimums.schoolMinsEnabled}
              setSchoolMinsEnabled={minimums.setSchoolMinsEnabled}
              schoolMins={minimums.schoolMins}
              setSchoolField={minimums.setSchoolField}
              personalMins={minimums.personalMins}
              setPersonalField={minimums.setPersonalField}
              getFloor={minimums.getFloor}
            />
            <PilotReadinessSection
              imsafe={readiness.imsafe}
              onSetImsafe={readiness.setImsafe}
              imsafeNotes={readiness.imsafeNotes}
              onSetImsafeNote={readiness.setImsafeNote}
              currency={readiness.currency}
              onCurrencyField={readiness.setCurrencyField}
              isIFR={flight.isIFR}
              isNight={!!flight.departureIsNight}
              depDate={flight.depTimeLocal ? flight.depTimeLocal.slice(0, 10) : null}
            />
          </>
        )}

      </div>

      {/* Bottom spacer */}
      <div className="flex-1" style={{ minHeight: '24px', maxHeight: '80px' }} />

    </div>
  )
}
