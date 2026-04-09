import React from 'react'

const ACK_TEXT =
  'I confirm that I am the Pilot in Command and bear sole responsibility for the ' +
  'safety of this flight under FAR 91.3. I understand this tool is a planning aid ' +
  'only, does not constitute an official FAA weather check, and makes no ' +
  'determination about the safety or advisability of any flight. I will obtain a ' +
  'standard weather check from 1800wxbrief.com or a certificated FSS before flight.'

export default function Acknowledgement({
  checked,
  onToggle,
  picName,
  onPicNameChange,
  onSubmit,
  canSubmit,
}) {
  return (
    <div
      className="flex flex-col gap-4 w-full rounded-lg p-4"
      style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
    >
      {/* PIC name */}
      <div className="flex flex-col gap-1">
        <label
          htmlFor="pic-name"
          className="text-label"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          Pilot in Command
        </label>
        <input
          id="pic-name"
          type="text"
          value={picName}
          onChange={e => onPicNameChange(e.target.value)}
          placeholder="Full name"
          autoComplete="name"
          className="w-full rounded-lg border px-4 focus:outline-none font-sans text-label"
          style={{
            height:          '44px',
            backgroundColor: 'var(--color-surface-2)',
            color:           'var(--color-text-primary)',
            borderColor:     'var(--color-border)',
            caretColor:      'var(--color-brand-gold)',
          }}
          onFocus={e => { e.target.style.borderColor = 'var(--color-brand-gold)' }}
          onBlur={e =>  { e.target.style.borderColor = 'var(--color-border)' }}
        />
      </div>

      {/* Acknowledgement checkbox */}
      <label className="flex items-start gap-3 cursor-pointer">
        {/* Custom checkbox — 44pt tap target via padding */}
        <span className="flex-shrink-0 flex items-center justify-center" style={{ paddingTop: '2px' }}>
          <input
            type="checkbox"
            checked={checked}
            onChange={onToggle}
            className="sr-only"
          />
          <span
            className="flex items-center justify-center rounded"
            style={{
              width:           '20px',
              height:          '20px',
              backgroundColor: checked ? 'var(--color-brand-gold)' : 'var(--color-surface-2)',
              border:          `2px solid ${checked ? 'var(--color-brand-gold)' : 'var(--color-border)'}`,
              transition:      'background-color 100ms, border-color 100ms',
              flexShrink:      0,
            }}
            aria-hidden="true"
          >
            {checked && (
              <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
                <path d="M1 5L4.5 8.5L11 1" stroke="#0D1120" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </span>
        </span>
        <span
          className="text-small"
          style={{ color: 'var(--color-text-secondary)', lineHeight: '1.6' }}
        >
          {ACK_TEXT}
        </span>
      </label>

      {/* Run Preflight Check button */}
      <button
        onClick={onSubmit}
        disabled={!canSubmit}
        className="w-full rounded-lg font-semibold text-label transition-opacity"
        style={{
          height:          '52px',
          backgroundColor: canSubmit ? 'var(--color-brand-gold)' : 'var(--color-surface-2)',
          color:           canSubmit ? 'var(--color-base)'       : 'var(--color-text-muted)',
          border:          canSubmit ? 'none' : '1px solid var(--color-border)',
          cursor:          canSubmit ? 'pointer' : 'not-allowed',
          fontSize:        'var(--text-body)',
          transition:      'background-color 150ms, color 150ms',
        }}
      >
        Run Preflight Check
      </button>
    </div>
  )
}
