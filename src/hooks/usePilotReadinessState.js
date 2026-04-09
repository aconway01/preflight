import { useState } from 'react'

export function usePilotReadinessState() {
  // null = unanswered, true = Yes (concern), false = No (cleared)
  const [imsafe, setImsafeState] = useState({
    illness:    null,
    medication: null,
    stress:     null,
    alcohol:    null,
    fatigue:    null,
    emotion:    null,
  })

  const [imsafeNotes, setImsafeNotesState] = useState({
    illness: '', medication: '', stress: '',
    alcohol: '', fatigue:    '', emotion: '',
  })

  const [currency, setCurrency] = useState({
    dayLandings:      '',
    nightLandings:    '',
    flightReviewDate: '',
    iapCount:         '',
    holdsCount:       '',
  })

  function setImsafe(key, value) {
    setImsafeState(prev => ({ ...prev, [key]: value }))
  }

  function setImsafeNote(key, value) {
    setImsafeNotesState(prev => ({ ...prev, [key]: value }))
  }

  function setCurrencyField(key, value) {
    setCurrency(prev => ({ ...prev, [key]: value }))
  }

  return { imsafe, setImsafe, imsafeNotes, setImsafeNote, currency, setCurrencyField }
}
