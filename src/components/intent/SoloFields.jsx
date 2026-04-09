import React from 'react'
import DateInput from '../shared/DateInput'

function EndorsementBlock({ far, label, date, onDateChange, instructor, onInstructorChange }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-0.5">
        <span className="text-label" style={{ color: 'var(--color-text-secondary)' }}>
          {label}
          <span className="ml-2 text-small" style={{ color: 'var(--color-text-muted)' }}>{far}</span>
        </span>
        <span className="text-small" style={{ color: 'var(--color-text-muted)' }}>
          Entry optional — endorsement required by regulation
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div className="endorsement-inputs">
          <div>
            <DateInput value={date} onChange={onDateChange} />
          </div>
          <div>
            <input
              type="text"
              value={instructor}
              onChange={e => onInstructorChange(e.target.value)}
              placeholder="Instructor name"
              style={{
                width:           '100%',
                height:          '44px',
                backgroundColor: 'var(--color-surface-2)',
                color:           'var(--color-text-primary)',
                border:          '1px solid var(--color-border)',
                borderRadius:    '8px',
                padding:         '0 12px',
                fontSize:        'var(--text-label)',
                fontFamily:      'var(--font-sans)',
                caretColor:      'var(--color-brand-gold)',
                outline:         'none',
                boxSizing:       'border-box',
              }}
              onFocus={e => { e.target.style.borderColor = 'var(--color-brand-gold)' }}
              onBlur={e =>  { e.target.style.borderColor = 'var(--color-border)' }}
            />
          </div>
        </div>
        <style>{`
          .endorsement-inputs {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }
          @media (min-width: 768px) {
            .endorsement-inputs {
              flex-direction: row;
            }
            .endorsement-inputs > div {
              flex: 1;
            }
          }
        `}</style>
      </div>
    </div>
  )
}

// soloIsNight: true = any night conditions in this flight (departure or any leg arrival).
// When per-leg arrival times are added, the parent derives this as the union of all
// leg conditions — this component only reads the result and shows the appropriate endorsements.
export default function SoloFields({
  soloIsNight,
  soloEndorseDate,   onSoloEndorseDate,
  soloEndorseInstr,  onSoloEndorseInstr,
  soloNightEndDate,  onSoloNightEndDate,
  soloNightEndInstr, onSoloNightEndInstr,
}) {
  return (
    <div className="flex flex-col gap-4 w-full">

      {/* FAR 61.87 — solo endorsement, always required */}
      <EndorsementBlock
        far="FAR 61.87"
        label="Solo endorsement"
        date={soloEndorseDate}
        onDateChange={onSoloEndorseDate}
        instructor={soloEndorseInstr}
        onInstructorChange={onSoloEndorseInstr}
      />

      {/* FAR 61.93 — night solo cross-country, required when any leg is at night */}
      {soloIsNight === true && (
        <EndorsementBlock
          far="FAR 61.93"
          label="Night solo cross-country endorsement"
          date={soloNightEndDate}
          onDateChange={onSoloNightEndDate}
          instructor={soloNightEndInstr}
          onInstructorChange={onSoloNightEndInstr}
        />
      )}

    </div>
  )
}
