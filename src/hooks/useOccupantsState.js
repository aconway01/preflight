import { useState, useCallback } from 'react'

let _nextId = 1

export function useOccupantsState() {
  const [occupants, setOccupants] = useState([])

  const addOccupant = useCallback(() => {
    setOccupants(prev => [...prev, { id: _nextId++, name: '', role: 'Passenger', cert: '' }])
  }, [])

  const updateOccupant = useCallback((id, field, value) => {
    setOccupants(prev => prev.map(o => o.id === id ? { ...o, [field]: value } : o))
  }, [])

  const removeOccupant = useCallback((id) => {
    setOccupants(prev => prev.filter(o => o.id !== id))
  }, [])

  return { occupants, addOccupant, updateOccupant, removeOccupant }
}
