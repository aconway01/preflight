import { useState, useCallback } from 'react'
import { CA_DATA } from '../data/config'

export function useMinimumsState() {
  const [schoolMinsEnabled, setSchoolMinsEnabled] = useState(true)
  const [schoolMins,  setSchoolMins]  = useState(() => JSON.parse(JSON.stringify(CA_DATA.SCHOOL.minimums)))
  const [personalMins, setPersonalMins] = useState(() => JSON.parse(JSON.stringify(CA_DATA.DEFAULT_PERSONAL_MINS)))

  const setSchoolField = useCallback((mode, field, rawVal) => {
    const val = rawVal === '' ? null : parseFloat(rawVal)
    setSchoolMins(prev => ({ ...prev, [mode]: { ...prev[mode], [field]: isNaN(val) ? null : val } }))
  }, [])

  const setPersonalField = useCallback((mode, field, rawVal) => {
    const val = rawVal === '' ? null : parseFloat(rawVal)
    setPersonalMins(prev => ({ ...prev, [mode]: { ...prev[mode], [field]: isNaN(val) ? null : val } }))
  }, [])

  // Returns the active floor for a field+mode: the more restrictive of FAA and (when enabled) school.
  // 'min' direction fields (visibility, ceiling): more restrictive = higher value.
  // 'max' direction fields (wind, gust, DA):      more restrictive = lower value.
  // Returns null when no floor is set at either level.
  const getFloor = useCallback((mode, field) => {
    const def = CA_DATA.MINIMUMS_FIELDS.find(f => f.key === field)
    if (!def) return null
    const faaVal = CA_DATA.FAA_MINIMUMS[mode]?.[field] ?? null
    const schVal = schoolMinsEnabled ? (schoolMins[mode]?.[field] ?? null) : null
    if (faaVal == null && schVal == null) return null
    if (def.direction === 'min') {
      return Math.max(faaVal ?? -Infinity, schVal ?? -Infinity)
    } else {
      return Math.min(faaVal ?? Infinity, schVal ?? Infinity)
    }
  }, [schoolMinsEnabled, schoolMins])

  return {
    schoolMinsEnabled, setSchoolMinsEnabled,
    schoolMins, setSchoolField,
    personalMins, setPersonalField,
    getFloor,
  }
}
