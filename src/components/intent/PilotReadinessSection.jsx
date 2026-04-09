import React, { useState } from 'react'
import DateInput from '../shared/DateInput'

const IMSAFE_ITEMS = [
  { key: 'illness',    letter: 'I', question: 'Are you currently ill or feeling unwell?' },
  { key: 'medication', letter: 'M', question: 'Are you taking any medications that could affect your flying?' },
  { key: 'stress',     letter: 'S', question: 'Are you under significant stress or psychological pressure?' },
  { key: 'alcohol',    letter: 'A', question: 'Have you consumed alcohol in the last 8 hours, or are you impaired?' },
  { key: 'fatigue',    letter: 'F', question: 'Are you inadequately rested or fatigued?' },
  { key: 'emotion',    letter: 'E', question: 'Are you emotionally unsettled or distracted?' },
]

const fieldStyle = {
  height:          '44px',
  backgroundColor: 'var(--color-base)',
  color:           'var(--color-text-primary)',
  border:          '1px solid var(--color-border)',
  borderRadius:    '6px',
  padding:         '0 12px',
  fontSize:        'var(--text-label)',
  fontFamily:      'var(--font-sans)',
  outline:         'none',
  boxSizing:       'border-box',
  width:           '100%',
}

// value: null (unanswered) | true (Yes / concern) | false (No / clear)
// Clicking the active selection again deselects it back to null.
function YesNoToggle({ value, onChange }) {
  const btn = (label, v, activeColor, activeText) => ({
    height:          '32px',
    padding:         '0 14px',
    border:          `1px solid ${value === v ? activeColor : 'var(--color-border)'}`,
    borderRadius:    '4px',
    cursor:          'pointer',
    fontSize:        'var(--text-small)',
    fontFamily:      'var(--font-sans)',
    fontWeight:      value === v ? '600' : '400',
    backgroundColor: value === v ? activeColor : 'transparent',
    color:           value === v ? activeText  : 'var(--color-text-muted)',
    transition:      'background-color 0.1s, color 0.1s, border-color 0.1s',
  })

  return (
    <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
      <button type="button" style={btn('Yes', true,  'var(--color-marginal)', '#0D1120')}
        onClick={() => onChange(value === true  ? null : true)}>Yes</button>
      <button type="button" style={btn('No',  false, 'var(--color-border)',   'var(--color-text-primary)')}
        onClick={() => onChange(value === false ? null : false)}>No</button>
    </div>
  )
}

function LabeledField({ label, far, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <label className="text-small" style={{ color: 'var(--color-text-muted)' }}>
        {label}
        {far && <span style={{ marginLeft: '6px', opacity: 0.65 }}>{far}</span>}
      </label>
      {children}
    </div>
  )
}

// Returns true if the flight review is still current (within 24 calendar months
// of the departure date), false if it has lapsed. Both args are "YYYY-MM-DD" strings.
function reviewIsCurrent(reviewDateStr, depDateStr) {
  if (!reviewDateStr || !depDateStr) return true  // not entered — not a failure
  const expiry = new Date(reviewDateStr)
  expiry.setMonth(expiry.getMonth() + 24)
  return new Date(depDateStr) <= expiry
}

// − / + stepper for small whole-number counts.
// '' = not entered (shows —); '0'..'N' = explicit value.
// Decrement below 0 returns to ''.
function CountStepper({ value, onChange }) {
  const entered = value !== ''
  const count   = entered ? parseInt(value, 10) : 0

  // Local draft lets the user type freely; committed on blur.
  const [draft, setDraft] = React.useState(null)  // null = not editing

  function decrement() {
    if (!entered) return
    onChange(count <= 0 ? '' : String(count - 1))
  }
  function increment() {
    onChange(String(entered ? count + 1 : 1))
  }

  function handleInputChange(e) {
    setDraft(e.target.value)
  }

  function handleBlur() {
    const raw = (draft ?? value).trim()
    setDraft(null)
    if (raw === '' || raw === '—') { onChange(''); return }
    const n = parseInt(raw, 10)
    if (isNaN(n) || n < 0) { onChange(entered ? value : ''); return }
    onChange(String(n))
  }

  function handleFocus(e) {
    setDraft(entered ? value : '')
    e.target.select()
  }

  const displayValue = draft !== null ? draft : (entered ? value : '')

  const btnStyle = {
    width:           '44px',
    height:          '44px',
    flexShrink:      0,
    display:         'flex',
    alignItems:      'center',
    justifyContent:  'center',
    background:      'none',
    border:          'none',
    cursor:          'pointer',
    fontSize:        '1.25rem',
    lineHeight:      1,
    color:           'var(--color-text-muted)',
    fontFamily:      'var(--font-sans)',
    transition:      'color 0.1s',
  }

  return (
    <div style={{
      display:         'flex',
      alignItems:      'center',
      border:          '1px solid var(--color-border)',
      borderRadius:    '8px',
      backgroundColor: 'var(--color-base)',
      overflow:        'hidden',
      width:           'fit-content',
    }}>
      <button
        type="button"
        onClick={decrement}
        disabled={!entered}
        aria-label="Decrease"
        style={{ ...btnStyle, opacity: entered ? 1 : 0.3, cursor: entered ? 'pointer' : 'default' }}
        onMouseEnter={e => { if (entered) e.currentTarget.style.color = 'var(--color-text-primary)' }}
        onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-muted)' }}
      >−</button>

      <input
        type="text"
        inputMode="numeric"
        value={displayValue}
        placeholder="—"
        onChange={handleInputChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        style={{
          minWidth:        '52px',
          width:           '52px',
          height:          '44px',
          display:         'flex',
          alignItems:      'center',
          textAlign:       'center',
          fontFamily:      'var(--font-mono)',
          fontSize:        'var(--text-title)',
          color:           entered || draft !== null ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
          border:          'none',
          borderLeft:      '1px solid var(--color-border)',
          borderRight:     '1px solid var(--color-border)',
          background:      'transparent',
          outline:         'none',
          padding:         0,
          boxSizing:       'border-box',
        }}
      />

      <button
        type="button"
        onClick={increment}
        aria-label="Increase"
        style={btnStyle}
        onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-text-primary)' }}
        onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-muted)' }}
      >+</button>
    </div>
  )
}

export default function PilotReadinessSection({ imsafe, onSetImsafe, imsafeNotes, onSetImsafeNote, currency, onCurrencyField, isIFR, isNight, depDate }) {
  const [open, setOpen] = useState(false)

  const vals     = Object.values(imsafe)
  const yesCount = vals.filter(v => v === true).length
  const allImsafeNo = vals.every(v => v === false)

  // Count entered currency values that fail their regulatory threshold.
  let currencyFails = 0
  if (!reviewIsCurrent(currency.flightReviewDate, depDate))                      currencyFails++
  if (currency.dayLandings   !== '' && parseInt(currency.dayLandings)   < 3)     currencyFails++
  if (isNight && currency.nightLandings !== '' && parseInt(currency.nightLandings) < 3) currencyFails++
  if (isIFR  && currency.iapCount       !== '' && parseInt(currency.iapCount)     < 6)  currencyFails++

  const totalConcerns = yesCount + currencyFails
  const allClear      = allImsafeNo && currencyFails === 0

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-lg text-label font-medium text-left"
        style={{
          padding:         '10px 16px',
          backgroundColor: 'transparent',
          border:          '1px solid var(--color-border)',
          color:           'var(--color-text-secondary)',
          cursor:          'pointer',
          display:         'flex',
          alignItems:      'center',
          gap:             '8px',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-text-muted)' }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)' }}
      >
        <span style={{ color: 'var(--color-text-muted)', lineHeight: 1 }}>+</span>
        Add pilot readiness
        {totalConcerns > 0 && (
          <span style={{ marginLeft: 'auto', fontSize: '0.6rem', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'var(--color-marginal)', color: '#0D1120', fontWeight: 600 }}>
            {totalConcerns} concern{totalConcerns > 1 ? 's' : ''}
          </span>
        )}
        {allClear && totalConcerns === 0 && (
          <span style={{ marginLeft: 'auto', fontSize: '0.6rem', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'var(--color-within)', color: '#0D1120', fontWeight: 600 }}>
            all clear
          </span>
        )}
      </button>
    )
  }

  return (
    <div
      className="w-full rounded-lg"
      style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)', padding: '16px' }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <span className="text-label font-medium" style={{ color: 'var(--color-text-secondary)' }}>Pilot Readiness</span>
        <button
          onClick={() => setOpen(false)}
          className="text-small"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', fontFamily: 'var(--font-sans)', padding: '4px' }}
        >
          Collapse
        </button>
      </div>

      {/* ── IMSAFE ── */}
      <div style={{ marginBottom: '20px' }}>
        <span className="text-small font-medium" style={{ color: 'var(--color-text-muted)', letterSpacing: '0.06em', display: 'block', marginBottom: '10px' }}>
          IMSAFE
        </span>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {IMSAFE_ITEMS.map(item => {
            const val   = imsafe[item.key]
            const isYes = val === true
            return (
              <div
                key={item.key}
                style={{
                  display:      'flex',
                  flexDirection:'column',
                  padding:      '10px 0',
                  borderBottom: '1px solid var(--color-border)',
                  borderLeft:   isYes ? '3px solid var(--color-marginal)' : '3px solid transparent',
                  transition:   'border-color 0.15s',
                }}
              >
                {/* Letter + question on same line — indented to sit inside the card */}
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', paddingLeft: '10px' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--color-text-muted)', flexShrink: 0 }}>
                    {item.letter}
                  </span>
                  <span
                    className="text-label"
                    style={{ flex: 1, color: isYes ? 'var(--color-marginal)' : 'var(--color-text-primary)', transition: 'color 0.15s' }}
                  >
                    {item.question}
                  </span>
                </div>

                {/* Toggle — full-width container, no padding, so center is the true card center */}
                <div style={{ display: 'flex', justifyContent: 'center', width: '100%', marginTop: '8px' }}>
                  <YesNoToggle
                    value={val}
                    onChange={v => {
                      onSetImsafe(item.key, v)
                      if (v !== true) onSetImsafeNote(item.key, '')
                    }}
                  />
                </div>

                {/* Notes — only when Yes, indented to align with question text */}
                {isYes && (
                  <div style={{ paddingLeft: '10px', marginTop: '10px' }}>
                    <input
                      type="text"
                      value={imsafeNotes[item.key]}
                      onChange={e => onSetImsafeNote(item.key, e.target.value)}
                      placeholder="Add a note (optional)"
                      style={{
                        width:           '100%',
                        height:          '44px',
                        backgroundColor: 'var(--color-base)',
                        color:           'var(--color-text-primary)',
                        border:          '1px solid var(--color-border)',
                        borderRadius:    '6px',
                        padding:         '0 12px',
                        fontSize:        'var(--text-label)',
                        fontFamily:      'var(--font-sans)',
                        outline:         'none',
                        boxSizing:       'border-box',
                      }}
                      onFocus={e => { e.target.style.borderColor = 'var(--color-brand-gold)' }}
                      onBlur={e =>  { e.target.style.borderColor = 'var(--color-border)' }}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Currency ── */}
      <div>
        <span className="text-small font-medium" style={{ color: 'var(--color-text-muted)', letterSpacing: '0.06em', display: 'block', marginBottom: '10px' }}>
          CURRENCY
        </span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
            <LabeledField label="Day landings — last 90 days" far="FAR 61.57(a)">
              <CountStepper value={currency.dayLandings} onChange={v => onCurrencyField('dayLandings', v)} />
            </LabeledField>
            <LabeledField label="Night landings — last 90 days" far="FAR 61.57(b)">
              <CountStepper value={currency.nightLandings} onChange={v => onCurrencyField('nightLandings', v)} />
            </LabeledField>
          </div>

          <LabeledField label="Flight review date" far="FAR 61.56">
            <DateInput
              value={currency.flightReviewDate}
              onChange={v => onCurrencyField('flightReviewDate', v)}
            />
          </LabeledField>

          {isIFR && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
              <LabeledField label="Instrument approaches — last 6 mo" far="FAR 61.57(c)">
                <CountStepper value={currency.iapCount} onChange={v => onCurrencyField('iapCount', v)} />
              </LabeledField>
              <LabeledField label="Holds — last 6 months" far="FAR 61.57(c)">
                <CountStepper value={currency.holdsCount} onChange={v => onCurrencyField('holdsCount', v)} />
              </LabeledField>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
