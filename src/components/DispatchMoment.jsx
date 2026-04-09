import React, { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import DateInput from './shared/DateInput'

// ── Shared helpers ────────────────────────────────────────────────

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function fmtFilename(dep, arr) {
  return `${todayIso()}-CAPreflight-${dep || 'DEP'}-${arr || 'ARR'}`
}

function isIOS() {
  if (typeof navigator === 'undefined') return false
  return /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

// Build "KIAD DCT MAPAX DCT KOKV DCT KARR" from route legs.
// Each leg has from, to, waypoints[].
function buildDctRoute(route) {
  if (!route?.legs?.length) return ''
  const nodes = []
  route.legs.forEach((leg, i) => {
    if (i === 0) nodes.push(leg.from)
    ;(leg.waypoints ?? []).forEach(wp => nodes.push(wp))
    nodes.push(leg.to)
  })
  return nodes.join(' DCT ')
}

// Verdict helpers (mirrored from ReviewMoment to avoid a shared import)
function recKey(rec) {
  if (!rec) return 'WITHIN'
  const u = rec.toUpperCase().replace(/_/g, ' ')
  if (u.includes('NOT LEGAL')) return 'NOT_LEGAL'
  if (u.includes('BELOW'))     return 'BELOW'
  if (u.includes('MARGINAL'))  return 'MARGINAL'
  return 'WITHIN'
}
const REC_ORDER = { NOT_LEGAL: 4, BELOW: 3, MARGINAL: 2, WITHIN: 1 }
function verdictLabel(rec) {
  const k = recKey(rec)
  if (k === 'NOT_LEGAL') return 'Not Legal'
  if (k === 'BELOW')     return 'Below Minimums'
  if (k === 'MARGINAL')  return 'Marginal'
  return 'Within Minimums'
}
function verdictColor(rec) {
  const k = recKey(rec)
  if (k === 'NOT_LEGAL' || k === 'BELOW') return '#FB923C'
  if (k === 'MARGINAL')                   return '#FBBF24'
  return '#4ADE80'
}
// CSS class names for verdict colors in print — darker variants of the screen colors
// for legibility on white paper. Used alongside the broad print color reset.
function verdictPrintClass(rec) {
  const k = recKey(rec)
  if (k === 'MARGINAL')                   return 'ca-verdict-marginal'
  if (k === 'BELOW' || k === 'NOT_LEGAL') return 'ca-verdict-below'
  return 'ca-verdict-within'
}
function worstRec(data) {
  let best = 'WITHIN', bestOrder = 1
  for (const leg of data?.legs ?? []) {
    for (const report of leg.reports ?? []) {
      const k = recKey(report.recommendation)
      const o = REC_ORDER[k] ?? 1
      if (o > bestOrder) { bestOrder = o; best = k }
    }
  }
  return best
}
function dedup(arr, keyFn) {
  const seen = new Set()
  return arr.filter(item => { const k = keyFn(item); if (seen.has(k)) return false; seen.add(k); return true })
}

const IMSAFE_LABELS = {
  illness: 'Illness', medication: 'Medication', stress: 'Stress',
  alcohol: 'Alcohol', fatigue: 'Fatigue', emotion: 'Emotion',
}

const SIGNOFF_TITLES = ['PIC Confirmation', 'CFI Sign-off', 'Student Confirmation']

// ── Print area (portal, always in DOM while Dispatch is mounted) ──

// activeSignoffs: array of { title, date } objects
function PrintArea({ data, payload, activeSignoffs }) {
  const route    = payload?.route
  const flight   = payload?.flight
  const readiness= payload?.readiness

  const legs     = data?.legs ?? []
  const dep      = legs[0]?.departure      || route?.legs?.[0]?.from                             || ''
  const arr      = legs[legs.length - 1]?.arrival || route?.legs?.[route?.legs?.length - 1]?.to || ''
  const dctRoute = buildDctRoute(route)
  const dateStr  = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const overall  = worstRec(data)

  const gairmets = dedup(legs.flatMap(l => l.routeIntelligence?.gairmets ?? []),
    g => `${g.hazard}|${g.validFrom}|${g.validTo}|${g.product}`)
  const sigmets  = dedup(legs.flatMap(l => l.routeIntelligence?.sigmets ?? []),
    s => s.id ?? `${s.rawText}|${s.validFrom}`)
  const convSigs = dedup(legs.flatMap(l => l.routeIntelligence?.convectiveSigmets ?? []),
    s => s.id ?? `${s.rawText}|${s.validFrom}`)
  const pireps   = dedup(legs.flatMap(l => l.routeIntelligence?.pireps ?? []),
    p => p.rawText ?? JSON.stringify(p))
  const allSfras = dedup(legs.flatMap(l => l.routeIntelligence?.sfras ?? []),
    s => s.id ?? s.name ?? JSON.stringify(s))
  const allTerrain = dedup(legs.flatMap(l => l.routeIntelligence?.terrain ?? []),
    t => typeof t === 'string' ? t : (t.note ?? t.warning ?? JSON.stringify(t)))

  const { imsafe = {}, imsafeNotes = {}, currency = {} } = readiness ?? {}
  const anyImsafe   = Object.values(imsafe).some(v => v !== null && v !== undefined)
  const anyCurrency = Object.values(currency).some(v => v !== '' && v != null)

  const pRow = (label, value) => value ? (
    <div style={{ display: 'flex', gap: '8px', marginBottom: '3pt' }}>
      <span style={{ color: '#666', minWidth: '120pt' }}>{label}</span>
      <span style={{ fontFamily: 'monospace' }}>{value}</span>
    </div>
  ) : null

  return createPortal(
    <>
      <style>{`
        .ca-print-area { display: none; }
        @media print {
          body > #root  { display: none !important; }
          .ca-print-area {
            display: block !important;
            font-family: -apple-system, sans-serif;
            font-size: 10pt;
            color: #000000;
            background: #ffffff;
            --color-text-primary:   #000000;
            --color-text-secondary: #000000;
            --color-text-muted:     #000000;
            --color-border:         #cccccc;
            --color-surface:        #ffffff;
            --color-surface-2:      #ffffff;
          }
          /* Reset all inline colors to black for print — overrides hardcoded hex values */
          .ca-print-area * {
            color: #000000 !important;
            background-color: #ffffff !important;
            border-color: #cccccc !important;
          }
          /* Verdict colors — darker print variants, beat the * reset via higher specificity */
          .ca-print-area .ca-verdict-within   { color: #15803d !important; }
          .ca-print-area .ca-verdict-marginal { color: #b45309 !important; }
          .ca-print-area .ca-verdict-below    { color: #c2410c !important; }
          /* Concern items — amber-700, legible on white */
          .ca-print-area .ca-concern-item     { color: #b45309 !important; }
          .ca-print-footer { position: fixed; bottom: 0; left: 0; right: 0; font-size: 7.5pt; color: #444; border-top: 0.5pt solid #cccccc; padding-top: 3pt; background: #ffffff; }
          .ca-print-section { margin-bottom: 14pt; }
          .ca-print-section-title { font-size: 8pt; text-transform: uppercase; letter-spacing: 0.06em; color: #444; border-bottom: 0.5pt solid #cccccc; padding-bottom: 3pt; margin-bottom: 8pt; }
          .ca-print-card { border: 0.5pt solid #cccccc; border-radius: 3pt; padding: 7pt; margin-bottom: 6pt; page-break-inside: avoid; }
          @page { margin: 1.5cm; }
        }
      `}</style>

      <div className="ca-print-area">
        {/* Header */}
        <div style={{ marginBottom: '16pt' }}>
          <div style={{ fontSize: '8pt', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#888', marginBottom: '4pt' }}>
            Central Aviation — Preflight Summary
          </div>
          <h1 className={verdictPrintClass(overall)} style={{ margin: '0 0 4pt', fontSize: '16pt', fontWeight: 700 }}>
            {verdictLabel(overall)}
          </h1>
          <div style={{ display: 'flex', gap: '16pt', flexWrap: 'wrap', color: '#444', fontSize: '10pt', marginBottom: '6pt' }}>
            <span>{dep} → {arr}</span>
            <span>{dateStr}</span>
            {flight?.picName && <span>PIC: {flight.picName}</span>}
          </div>
          {dctRoute && (
            <div style={{ fontFamily: 'monospace', fontSize: '9pt', color: '#555', marginTop: '4pt' }}>{dctRoute}</div>
          )}
          {flight?.depTimeLocal && (
            <div style={{ fontSize: '9pt', color: '#666', marginTop: '3pt' }}>
              Departure: {flight.depTimeLocal}{flight?.depTimeUtcLabel ? ` (${flight.depTimeUtcLabel})` : ''}
              {flight?.cruiseAlt ? ` · ${Number(flight.cruiseAlt).toLocaleString()} ft` : ''}
              {` · ${flight?.isIFR ? 'IFR' : 'VFR'}`}
            </div>
          )}
        </div>

        {/* Station reports */}
        <div className="ca-print-section">
          <div className="ca-print-section-title">Station Reports</div>
          {legs.map((leg, li) => (
            <div key={li}>
              {legs.length > 1 && (
                <div style={{ fontFamily: 'monospace', fontSize: '9pt', color: '#888', marginBottom: '4pt' }}>
                  Leg {li + 1}: {leg.departure} → {leg.arrival}
                </div>
              )}
              {(leg.reports ?? []).map((report, ri) => {
                const a = report.departureAnalysis || report.arrivalAnalysis || {}
                const da = a.densityAltitude || {}
                return (
                  <div key={ri} className="ca-print-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5pt', flexWrap: 'wrap', gap: '4pt' }}>
                      <strong style={{ fontFamily: 'monospace', fontSize: '11pt' }}>
                        {report.station}{report.stationName ? ` — ${report.stationName}` : ''}
                      </strong>
                      <span style={{ fontSize: '9pt', fontWeight: 600 }}>{report.recommendation || ''}</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4pt 16pt', fontSize: '9pt', color: '#444' }}>
                      {a.flightCategory && <span><b>{a.flightCategory}</b></span>}
                      {a.windSpeed != null && <span>Wind: {a.windSpeed} kt{a.gustSpeed ? ` G${a.gustSpeed}` : ''}</span>}
                      {a.crosswind != null && <span>XWD: {a.crosswind} kt</span>}
                      {a.visibility != null && <span>Vis: {a.visibility} SM</span>}
                      {a.ceilingLabel && <span>Ceiling: {a.ceilingLabel}</span>}
                      {da.densityAlt != null && <span>DA: {da.densityAlt.toLocaleString()} ft</span>}
                      {a.isNight != null && <span>{a.isNight ? 'Night' : 'Day'}</span>}
                    </div>
                    {(a.concerns ?? []).map((c, ci) => (
                      <div key={ci} className="ca-concern-item" style={{ marginTop: '3pt', fontSize: '9pt' }}>
                        • {c.replace(/^[\p{Emoji_Presentation}\p{Extended_Pictographic}\s]+/u, '').trim()}
                      </div>
                    ))}
                    {report.metarRaw && (
                      <div style={{ marginTop: '5pt', fontFamily: 'monospace', fontSize: '8pt', color: '#666', wordBreak: 'break-all' }}>
                        {report.metarRaw}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>

        {/* Advisories */}
        {(gairmets.length + sigmets.length + convSigs.length + pireps.length > 0) && (
          <div className="ca-print-section">
            <div className="ca-print-section-title">Advisories</div>
            {gairmets.map((g, i) => (
              <div key={i} className="ca-print-card">
                <strong style={{ fontSize: '9pt' }}>G-AIRMET: {(g.product || g.hazard || '').toUpperCase()}</strong>
                {g.dueTo && <div style={{ fontSize: '9pt', color: '#555' }}>Due to: {g.dueTo}</div>}
                {(g.validFrom || g.validTo) && <div style={{ fontSize: '8pt', color: '#888' }}>{g.validFrom} → {g.validTo}</div>}
              </div>
            ))}
            {[...sigmets, ...convSigs].map((s, i) => (
              <div key={i} className="ca-print-card">
                <strong style={{ fontSize: '9pt' }}>{convSigs.includes(s) ? 'Convective SIGMET' : 'SIGMET'}{s.id ? ` ${s.id}` : ''}</strong>
                {s.rawText && <div style={{ fontFamily: 'monospace', fontSize: '8pt', color: '#555', wordBreak: 'break-all', marginTop: '3pt' }}>{s.rawText}</div>}
              </div>
            ))}
            {pireps.length > 0 && (
              <div className="ca-print-card">
                <strong style={{ fontSize: '9pt' }}>PIREPs ({pireps.length})</strong>
                {pireps.map((p, i) => p.rawText && (
                  <div key={i} style={{ fontFamily: 'monospace', fontSize: '8pt', color: '#555', marginTop: '3pt', wordBreak: 'break-all' }}>{p.rawText}</div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Route intelligence */}
        {legs.some(l => l.routeIntelligence) && (
          <div className="ca-print-section">
            <div className="ca-print-section-title">Route Intelligence</div>
            {legs.map((leg, li) => {
              const wa = leg.routeIntelligence?.windsAloft
              if (!wa) return null
              const cw = wa.cruiseWind || {}
              const hw = wa.headwindComponent || {}
              return (
                <div key={li} className="ca-print-card">
                  <strong style={{ fontSize: '9pt' }}>Winds Aloft{legs.length > 1 ? ` — Leg ${li + 1}` : ''}</strong>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4pt 14pt', fontSize: '9pt', color: '#444', marginTop: '4pt' }}>
                    {wa.station && <span>Station: {wa.station}</span>}
                    {(cw.direction != null && cw.speed != null) && <span>Cruise: {String(cw.direction).padStart(3,'0')}°/{cw.speed} kt{cw.altitude ? ` @ ${cw.altitude.toLocaleString()} ft` : ''}</span>}
                    {hw.component != null && <span>{hw.isHeadwind ? 'Headwind' : hw.isTailwind ? 'Tailwind' : 'Component'}: {Math.abs(hw.component)} kt</span>}
                    {wa.freezingLevel && <span>Freezing level: {wa.freezingLevel}</span>}
                    {wa.validTime && <span>Valid: {wa.validTime}</span>}
                  </div>
                </div>
              )
            })}
            {(() => {
              const first = legs.find(l => l.routeIntelligence)?.routeIntelligence
              return first?.hemispheric ? (
                <div className="ca-print-card">
                  <strong style={{ fontSize: '9pt' }}>Hemispheric Rule (FAR 91.159): {first.hemispheric.pass ? 'PASS' : 'CHECK'}</strong>
                  {first.hemispheric.direction && <span style={{ fontSize: '9pt', color: '#555', marginLeft: '8pt', textTransform: 'capitalize' }}>{first.hemispheric.direction}</span>}
                  {first.hemispheric.course != null && <span style={{ fontSize: '9pt', color: '#888', marginLeft: '6pt' }}>{first.hemispheric.course}°</span>}
                </div>
              ) : null
            })()}
            {allSfras.length > 0 && (
              <div className="ca-print-card">
                <strong style={{ fontSize: '9pt' }}>Special Use Airspace</strong>
                {allSfras.map((s, i) => (
                  <div key={i} style={{ fontSize: '9pt', color: '#444', marginTop: '3pt' }}>
                    {s.name || 'SFRA'}{s.inside ? ' — INSIDE' : s.distNm != null ? ` — ${s.distNm} nm` : ''}
                    {s.note && <span style={{ color: '#666' }}> · {s.note}</span>}
                  </div>
                ))}
              </div>
            )}
            {allTerrain.length > 0 && (
              <div className="ca-print-card" style={{ borderColor: '#dc2626' }}>
                <strong style={{ fontSize: '9pt', color: '#dc2626' }}>Terrain</strong>
                {allTerrain.map((t, i) => (
                  <div key={i} style={{ fontSize: '9pt', color: '#555', marginTop: '3pt' }}>
                    {typeof t === 'string' ? t : (t.note ?? t.warning ?? JSON.stringify(t))}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Pilot readiness */}
        {(anyImsafe || anyCurrency) && (
          <div className="ca-print-section">
            <div className="ca-print-section-title">Pilot Readiness</div>
            {anyImsafe && (
              <div className="ca-print-card">
                <strong style={{ fontSize: '9pt' }}>IMSAFE</strong>
                <div style={{ marginTop: '4pt' }}>
                  {Object.entries(imsafe).map(([key, val]) => {
                    if (val === null || val === undefined) return null
                    const label = IMSAFE_LABELS[key] || key
                    const note  = imsafeNotes[key]
                    return (
                      <div key={key} style={{ fontSize: '9pt', color: val === true ? '#b45309' : '#333', marginBottom: '2pt' }}>
                        <strong>{label}:</strong> {val === true ? `Yes${note ? ` — ${note}` : ''}` : 'No'}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
            {anyCurrency && (
              <div className="ca-print-card">
                <strong style={{ fontSize: '9pt' }}>Currency</strong>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4pt 16pt', fontSize: '9pt', color: '#444', marginTop: '4pt' }}>
                  {currency.flightReviewDate && <span>Flight review: {currency.flightReviewDate}</span>}
                  {currency.dayLandings   !== '' && currency.dayLandings   != null && <span>Day landings: {currency.dayLandings}</span>}
                  {currency.nightLandings !== '' && currency.nightLandings != null && <span>Night landings: {currency.nightLandings}</span>}
                  {currency.iapCount      !== '' && currency.iapCount      != null && <span>Approaches: {currency.iapCount}</span>}
                  {currency.holdsCount    !== '' && currency.holdsCount    != null && <span>Holds: {currency.holdsCount}</span>}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Sign-offs — always starts on a new page */}
        {activeSignoffs.length > 0 && (
        <div className="ca-print-section" style={{ pageBreakBefore: 'always' }}>
          <div className="ca-print-section-title">Sign-offs</div>
          {activeSignoffs.map(({ title, date }) => {
            const dateDisplay = date
              ? new Date(date + 'T12:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
              : null
            return (
              <div key={title} className="ca-print-card" style={{ pageBreakInside: 'avoid' }}>
                <strong style={{ fontSize: '10pt' }}>{title}</strong>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8pt', marginTop: '8pt', fontSize: '9pt' }}>
                  <div>
                    <div style={{ color: '#888', marginBottom: '2pt' }}>Name</div>
                    <div style={{ borderBottom: '0.5pt solid #ccc', paddingBottom: '14pt', minWidth: '120pt' }} />
                  </div>
                  <div>
                    <div style={{ color: '#888', marginBottom: '2pt' }}>Certificate #</div>
                    <div style={{ borderBottom: '0.5pt solid #ccc', paddingBottom: '14pt' }} />
                  </div>
                  <div>
                    <div style={{ color: '#888', marginBottom: '2pt' }}>Date</div>
                    {dateDisplay
                      ? <div style={{ fontFamily: 'monospace', fontSize: '9pt' }}>{dateDisplay}</div>
                      : <div style={{ borderBottom: '0.5pt solid #ccc', paddingBottom: '14pt' }} />
                    }
                  </div>
                  <div>
                    <div style={{ color: '#888', marginBottom: '2pt' }}>Signature</div>
                    <div style={{ borderBottom: '0.5pt solid #ccc', paddingBottom: '14pt' }} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        )}

        {/* Fixed per-page footer */}
        <div className="ca-print-footer">
          This Preflight Summary is a planning aid only and does not constitute an official FAA weather check.
          The Pilot in Command bears sole responsibility for the safety of the flight under FAR 91.3.
          {flight?.picName ? ` · PIC: ${flight.picName}` : ''}
          {' · '}Generated {new Date().toUTCString()}
        </div>
      </div>
    </>,
    document.body
  )
}

// ── Text report ───────────────────────────────────────────────────

// activeSignoffs: array of { title, date } objects
function buildTextReport(data, payload, activeSignoffs = []) {
  const route    = payload?.route
  const flight   = payload?.flight
  const readiness= payload?.readiness
  const legs     = data?.legs ?? []
  const dep      = legs[0]?.departure      || route?.legs?.[0]?.from                             || ''
  const arr      = legs[legs.length - 1]?.arrival || route?.legs?.[route?.legs?.length - 1]?.to || ''
  const dctRoute = buildDctRoute(route)
  const L = []
  const hr = (c = '─', n = 50) => c.repeat(n)

  L.push('CENTRAL AVIATION PREFLIGHT SUMMARY')
  L.push(hr('═'))
  L.push(`Generated: ${new Date().toUTCString()}`)
  L.push(`Route: ${dep} → ${arr}`)
  L.push(`Verdict: ${verdictLabel(worstRec(data))}`)
  if (dctRoute)               L.push(`DCT Route: ${dctRoute}`)
  if (flight?.depTimeLocal)   L.push(`Departure: ${flight.depTimeLocal}${flight?.depTimeUtcLabel ? ` (${flight.depTimeUtcLabel})` : ''}`)
  if (flight?.cruiseAlt)      L.push(`Cruise altitude: ${Number(flight.cruiseAlt).toLocaleString()} ft`)
  L.push(`Flight rules: ${flight?.isIFR ? 'IFR' : 'VFR'}`)
  if (flight?.picName)        L.push(`PIC: ${flight.picName}`)
  L.push('')

  // Station reports
  L.push('STATION REPORTS'); L.push(hr())
  for (const leg of legs) {
    if (legs.length > 1) L.push(`\nLeg: ${leg.departure} → ${leg.arrival}`)
    for (const report of leg.reports ?? []) {
      const a  = report.departureAnalysis || report.arrivalAnalysis || {}
      const da = a.densityAltitude || {}
      L.push(`\n${report.station}${report.stationName ? ` — ${report.stationName}` : ''}`)
      if (report.recommendation) L.push(`  Recommendation: ${report.recommendation}`)
      if (a.flightCategory)     L.push(`  Flight category: ${a.flightCategory}`)
      if (a.windSpeed != null)  L.push(`  Wind: ${a.windSpeed} kt${a.gustSpeed ? ` G${a.gustSpeed}` : ''}`)
      if (a.crosswind != null)  L.push(`  Crosswind: ${a.crosswind} kt`)
      if (a.visibility != null) L.push(`  Visibility: ${a.visibility} SM`)
      if (a.ceilingLabel)       L.push(`  Ceiling: ${a.ceilingLabel}`)
      if (a.isNight != null)    L.push(`  Conditions: ${a.isNight ? 'Night' : 'Day'}`)
      if (da.densityAlt != null) L.push(`  Density altitude: ${da.densityAlt.toLocaleString()} ft`)
      if (a.concerns?.length) {
        L.push('  Concerns:')
        a.concerns.forEach(c => L.push(`    • ${c.replace(/^[\p{Emoji_Presentation}\p{Extended_Pictographic}\s]+/u, '').trim()}`))
      }
      if (report.metarRaw) L.push(`  METAR: ${report.metarRaw}`)
      if (report.taf)      L.push(`  TAF:\n${report.taf}`)
    }
  }
  L.push('')

  // Advisories
  const gairmets = dedup(legs.flatMap(l => l.routeIntelligence?.gairmets ?? []), g => `${g.hazard}|${g.validFrom}|${g.validTo}|${g.product}`)
  const sigmets  = dedup(legs.flatMap(l => l.routeIntelligence?.sigmets ?? []), s => s.id ?? `${s.rawText}|${s.validFrom}`)
  const convSigs = dedup(legs.flatMap(l => l.routeIntelligence?.convectiveSigmets ?? []), s => s.id ?? `${s.rawText}|${s.validFrom}`)
  const pireps   = dedup(legs.flatMap(l => l.routeIntelligence?.pireps ?? []), p => p.rawText ?? JSON.stringify(p))
  if (gairmets.length || sigmets.length || convSigs.length || pireps.length) {
    L.push('ADVISORIES'); L.push(hr())
    gairmets.forEach(g => {
      L.push(`G-AIRMET: ${(g.product || g.hazard || '').toUpperCase()}`)
      if (g.dueTo)                  L.push(`  Due to: ${g.dueTo}`)
      if (g.validFrom || g.validTo) L.push(`  Valid: ${g.validFrom || ''} → ${g.validTo || ''}`)
    })
    sigmets.forEach(s => { L.push(`SIGMET${s.id ? ` ${s.id}` : ''}`); if (s.rawText) L.push(`  ${s.rawText}`) })
    convSigs.forEach(s => { L.push(`CONVECTIVE SIGMET${s.id ? ` ${s.id}` : ''}`); if (s.rawText) L.push(`  ${s.rawText}`) })
    if (pireps.length) { L.push(`PIREPs (${pireps.length}):`); pireps.forEach(p => { if (p.rawText) L.push(`  ${p.rawText}`) }) }
    L.push('')
  }

  // Route intelligence
  if (legs.some(l => l.routeIntelligence)) {
    L.push('ROUTE INTELLIGENCE'); L.push(hr())
    legs.forEach((leg, i) => {
      const wa = leg.routeIntelligence?.windsAloft
      if (!wa) return
      L.push(`${legs.length > 1 ? `Leg ${i+1} — ` : ''}Winds Aloft:`)
      const cw = wa.cruiseWind || {}
      const hw = wa.headwindComponent || {}
      if (cw.direction != null && cw.speed != null) L.push(`  Cruise: ${String(cw.direction).padStart(3,'0')}°/${cw.speed} kt${cw.altitude != null ? ` @ ${cw.altitude.toLocaleString()} ft` : ''}`)
      if (hw.component != null) L.push(`  ${hw.isHeadwind ? 'Headwind' : hw.isTailwind ? 'Tailwind' : 'Component'}: ${Math.abs(hw.component)} kt`)
      if (wa.freezingLevel) L.push(`  Freezing level: ${wa.freezingLevel}`)
      if (wa.validTime)     L.push(`  Valid: ${wa.validTime}`)
    })
    const first = legs.find(l => l.routeIntelligence)?.routeIntelligence
    if (first?.hemispheric) {
      L.push(`Hemispheric Rule (FAR 91.159): ${first.hemispheric.pass ? 'PASS' : 'CHECK'}`)
      if (first.hemispheric.direction) L.push(`  Direction: ${first.hemispheric.direction}`)
    }
    L.push('')
  }

  // Pilot readiness
  if (readiness) {
    const { imsafe = {}, imsafeNotes = {}, currency = {} } = readiness
    const hasAny = Object.values(imsafe).some(v => v !== null && v !== undefined) ||
                   Object.values(currency).some(v => v !== '' && v != null)
    if (hasAny) {
      L.push('PILOT READINESS'); L.push(hr())
      if (Object.values(imsafe).some(v => v !== null && v !== undefined)) {
        L.push('IMSAFE:')
        Object.entries(imsafe).forEach(([key, val]) => {
          if (val === null || val === undefined) return
          const label = IMSAFE_LABELS[key] || key
          const note  = imsafeNotes[key]
          L.push(`  ${label}: ${val === true ? `YES${note ? ` — ${note}` : ''}` : 'No'}`)
        })
      }
      if (Object.values(currency).some(v => v !== '' && v != null)) {
        L.push('Currency:')
        if (currency.flightReviewDate) L.push(`  Flight review: ${currency.flightReviewDate}`)
        if (currency.dayLandings   !== '' && currency.dayLandings   != null) L.push(`  Day landings (90 days): ${currency.dayLandings}`)
        if (currency.nightLandings !== '' && currency.nightLandings != null) L.push(`  Night landings (90 days): ${currency.nightLandings}`)
        if (currency.iapCount      !== '' && currency.iapCount      != null) L.push(`  Instrument approaches (6 mo): ${currency.iapCount}`)
        if (currency.holdsCount    !== '' && currency.holdsCount    != null) L.push(`  Holds (6 mo): ${currency.holdsCount}`)
      }
      L.push('')
    }
  }

  // Sign-offs — only blocks toggled on
  if (activeSignoffs.length > 0) {
    L.push('SIGN-OFFS'); L.push(hr())
    activeSignoffs.forEach(({ title, date }) => {
      const dateDisplay = date
        ? new Date(date + 'T12:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
        : '___________________________'
      L.push(title)
      L.push('  Name:           ___________________________')
      L.push('  Certificate #:  ___________________________')
      L.push(`  Date:           ${dateDisplay}`)
      L.push('  Signature:      ___________________________')
    })
    L.push('')
  }

  L.push(hr())
  L.push('DISCLAIMER')
  L.push('This Preflight Summary is a planning aid only and does not constitute')
  L.push('an official FAA weather check. The Pilot in Command bears sole')
  L.push('responsibility for the safety of the flight under FAR 91.3.')
  L.push('Always obtain a standard briefing from 1800wxbrief.com before flight.')

  return L.join('\n')
}

// ── Save-before-EFB modal ─────────────────────────────────────────

function SaveBeforeEfbModal({ onSaveFirst, onContinue }) {
  // Close on Escape
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onContinue() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onContinue])

  // Prevent body scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  const btnStyle = {
    flex: 1, height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'var(--color-surface-2)', color: 'var(--color-text-primary)',
    border: '1px solid var(--color-border)', borderRadius: '8px',
    cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-label)',
    fontWeight: 400,
  }

  return createPortal(
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        backgroundColor: 'rgba(0, 0, 0, 0.72)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px',
      }}
      onClick={onContinue}
      aria-modal="true"
      role="dialog"
      aria-label="Save before continuing?"
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '360px',
          backgroundColor: 'var(--color-surface)',
          borderRadius: '16px',
          border: '1px solid var(--color-border)',
          padding: '24px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        }}
      >
        <h3 style={{ margin: '0 0 8px', fontSize: 'var(--text-heading)', fontWeight: 600, color: 'var(--color-text-primary)', fontFamily: 'var(--font-sans)' }}>
          Save before continuing?
        </h3>
        <p className="text-small" style={{ margin: '0 0 20px', color: 'var(--color-text-secondary)', lineHeight: 1.55 }}>
          Save your Preflight Summary before sending to your EFB.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button type="button" style={btnStyle} onClick={onSaveFirst}
            onMouseEnter={e => { e.currentTarget.style.opacity = '0.8' }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}>
            Save first
          </button>
          <button type="button" style={btnStyle} onClick={onContinue}
            onMouseEnter={e => { e.currentTarget.style.opacity = '0.8' }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}>
            Continue without saving
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

// ── Main export ───────────────────────────────────────────────────

export default function DispatchMoment({ data, payload, onBack }) {
  const route  = payload?.route
  const flight = payload?.flight
  const legs   = data?.legs ?? []

  const dep      = legs[0]?.departure      || route?.legs?.[0]?.from                             || ''
  const arr      = legs[legs.length - 1]?.arrival || route?.legs?.[route?.legs?.length - 1]?.to || ''
  const dctRoute = buildDctRoute(route)

  // Sign-off toggles — dates are left blank for manual completion on the printed PDF
  const [incPic,     setIncPic]     = useState(false)
  const [incCfi,     setIncCfi]     = useState(false)
  const [incStudent, setIncStudent] = useState(false)
  const activeSignoffs = [
    incPic     && { title: 'PIC Confirmation' },
    incCfi     && { title: 'CFI Sign-off' },
    incStudent && { title: 'Student Confirmation' },
  ].filter(Boolean)

  // EFB / save state
  const [isSaved,      setIsSaved]      = useState(false)
  const [efbPromptFor, setEfbPromptFor] = useState(null)  // null | 'foreflight'|'garmin'|'fltplan'|'copy'
  const [copied,       setCopied]       = useState(null)  // null | button key

  const downloadsRef = useRef(null)

  // ── EFB actions ──
  const doForeFlight = useCallback(() => {
    if (!route?.legs?.length) return
    const first = route.legs[0]
    const last  = route.legs[route.legs.length - 1]
    const intermediate = []
    route.legs.forEach((leg, i) => {
      ;(leg.waypoints ?? []).forEach(wp => intermediate.push(wp))
      if (i < route.legs.length - 1) intermediate.push(leg.to)
    })
    const url = `foreflightmobile://v1/plan?from=${encodeURIComponent(first.from)}&to=${encodeURIComponent(last.to)}&route=${encodeURIComponent(intermediate.join(' '))}`
    window.location.href = url
  }, [route])

  function copyRoute(key) {
    if (!dctRoute) return
    navigator.clipboard.writeText(dctRoute).then(() => {
      setCopied(key)
      setTimeout(() => setCopied(null), 2000)
    })
  }

  function efbAction(key) {
    if (key === 'foreflight') doForeFlight()
    else                      copyRoute(key)
  }

  function handleEfbClick(key) {
    if (!isSaved) { setEfbPromptFor(key); return }
    efbAction(key)
  }

  // ── Downloads ──
  function handleDownloadPdf() {
    setIsSaved(true)
    const filename = fmtFilename(dep, arr)
    const origTitle = document.title
    document.title = `${filename}.pdf`
    window.print()
    window.addEventListener('afterprint', () => { document.title = origTitle }, { once: true })
  }

  function handleDownloadText() {
    setIsSaved(true)
    const text = buildTextReport(data, payload, activeSignoffs)
    const blob = new Blob([text], { type: 'text/plain' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `${fmtFilename(dep, arr)}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Styles ──
  const sectionHead = {
    fontSize: 'var(--text-label)', fontWeight: 600, color: 'var(--color-text-muted)',
    letterSpacing: '0.06em', display: 'block', marginBottom: '10px',
  }

  function actionBtn(variant = 'default') {
    const isPrimary = variant === 'primary'
    return {
      width: '100%', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center',
      gap: '8px', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-label)',
      fontWeight: isPrimary ? 600 : 400, borderRadius: '8px', transition: 'opacity 0.1s',
      backgroundColor: isPrimary ? 'var(--color-within)' : 'var(--color-surface-2)',
      color:           isPrimary ? '#0D1120'              : 'var(--color-text-primary)',
      border:          isPrimary ? 'none'                 : '1px solid var(--color-border)',
    }
  }

  return (
    <>
      <PrintArea data={data} payload={payload} activeSignoffs={activeSignoffs} />
      {efbPromptFor && (
        <SaveBeforeEfbModal
          onSaveFirst={() => {
            setEfbPromptFor(null)
            downloadsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }}
          onContinue={() => {
            const key = efbPromptFor
            setEfbPromptFor(null)
            efbAction(key)
          }}
        />
      )}

      <div className="flex-1 flex flex-col px-4" style={{ maxWidth: '640px', margin: '0 auto', width: '100%' }}>
        <div style={{ minHeight: '20px', flex: '0 1 48px' }} />

        {/* ── Header ── */}
        <div style={{ marginBottom: '28px' }}>
          <span className="text-small" style={{ color: 'var(--color-text-muted)', display: 'block', marginBottom: '8px', letterSpacing: '0.06em' }}>
            DISPATCH
          </span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', flexWrap: 'wrap', marginBottom: '8px' }}>
            <h2 style={{ margin: 0, fontSize: 'var(--text-display)', fontWeight: 600, color: 'var(--color-text-primary)', fontFamily: 'var(--font-sans)', lineHeight: 1.2 }}>
              Save &amp; Send
            </h2>
            {dep && arr && (
              <span className="font-mono text-small" style={{ color: 'var(--color-text-muted)' }}>{dep} → {arr}</span>
            )}
          </div>
          <button
            onClick={onBack}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-label)', padding: 0, minHeight: '44px', display: 'inline-flex', alignItems: 'center' }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-text-secondary)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-muted)' }}
          >
            ← Back to summary
          </button>
        </div>

        {/* ── Sign-offs ── */}
        <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '20px', marginBottom: '24px' }}>
          <span style={sectionHead}>SIGN-OFFS</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              { key: 'pic',     label: 'Include PIC confirmation',    value: incPic,     set: setIncPic },
              { key: 'cfi',     label: 'Include CFI sign-off',        value: incCfi,     set: setIncCfi },
              { key: 'student', label: 'Include student confirmation', value: incStudent, set: setIncStudent },
            ].map(({ key, label, value, set }) => (
              <button
                key={key}
                type="button"
                onClick={() => set(v => !v)}
                style={{
                  width: '100%', height: '44px', display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '0 14px', cursor: 'pointer', fontFamily: 'var(--font-sans)',
                  fontSize: 'var(--text-label)', textAlign: 'left',
                  backgroundColor: value ? 'var(--color-surface-2)' : 'transparent',
                  border: `1px solid ${value ? 'var(--color-text-muted)' : 'var(--color-border)'}`,
                  borderRadius: '8px', color: value ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                  transition: 'background-color 0.1s, border-color 0.1s, color 0.1s',
                }}
              >
                <span style={{
                  width: '16px', height: '16px', flexShrink: 0, borderRadius: '3px',
                  border: `1.5px solid ${value ? 'var(--color-text-muted)' : 'var(--color-border)'}`,
                  backgroundColor: value ? 'var(--color-text-muted)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '10px', color: 'var(--color-base)', transition: 'background-color 0.1s',
                }}>
                  {value ? '✓' : ''}
                </span>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Download ── */}
        <div ref={downloadsRef} style={{ borderTop: '1px solid var(--color-border)', paddingTop: '20px', marginBottom: '24px' }}>
          <span style={sectionHead}>DOWNLOAD</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button type="button" style={actionBtn('primary')} onClick={handleDownloadPdf}
              onMouseEnter={e => { e.currentTarget.style.opacity = '0.85' }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}>
              Download PDF
            </button>
            <button type="button" style={actionBtn()} onClick={handleDownloadText}
              onMouseEnter={e => { e.currentTarget.style.opacity = '0.8' }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}>
              Download text report
            </button>
          </div>
          {isSaved && (
            <p className="text-small" style={{ color: 'var(--color-within)', margin: '8px 0 0', lineHeight: 1.5 }}>
              Preflight Summary saved.
            </p>
          )}
        </div>

        {/* ── EFB Integration ── */}
        <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '20px', marginBottom: '24px' }}>
          <span style={sectionHead}>EFB INTEGRATION</span>

          {dctRoute && (
            <div style={{ marginBottom: '12px', padding: '8px 12px', backgroundColor: 'var(--color-base)', borderRadius: '6px', border: '1px solid var(--color-border)' }}>
              <span className="text-small" style={{ color: 'var(--color-text-muted)', display: 'block', marginBottom: '3px' }}>Route string</span>
              <span className="font-mono text-small" style={{ color: 'var(--color-text-primary)', wordBreak: 'break-all' }}>{dctRoute}</span>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {/* ForeFlight */}
            <div>
              <button
                type="button"
                style={{
                  ...actionBtn(),
                  ...(isIOS() ? {} : { opacity: 0.4, cursor: 'not-allowed' }),
                }}
                onClick={() => isIOS() && handleEfbClick('foreflight')}
              >
                → ForeFlight
              </button>
              {!isIOS() && (
                <p className="text-small" style={{ color: 'var(--color-text-muted)', margin: '4px 0 0 4px' }}>
                  ForeFlight link works on iPad and iPhone only
                </p>
              )}
            </div>

            <button type="button" style={actionBtn()} onClick={() => handleEfbClick('garmin')}
              onMouseEnter={e => { e.currentTarget.style.opacity = '0.8' }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}>
              {copied === 'garmin' ? '✓ Copied to clipboard' : '→ Garmin Pilot'}
            </button>

            <button type="button" style={actionBtn()} onClick={() => handleEfbClick('fltplan')}
              onMouseEnter={e => { e.currentTarget.style.opacity = '0.8' }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}>
              {copied === 'fltplan' ? '✓ Copied to clipboard' : '→ FltPlan'}
            </button>

            <button type="button" style={actionBtn()} onClick={() => handleEfbClick('copy')}
              onMouseEnter={e => { e.currentTarget.style.opacity = '0.8' }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}>
              {copied === 'copy' ? '✓ Copied to clipboard' : 'Copy Route'}
            </button>
          </div>

        </div>

        <p className="text-small" style={{ color: 'var(--color-text-muted)', textAlign: 'center', margin: '16px 0 0', lineHeight: 1.5 }}>
          Ensure all preflight checks are complete before departure.
        </p>

        <div style={{ minHeight: '48px' }} />
      </div>
    </>
  )
}
