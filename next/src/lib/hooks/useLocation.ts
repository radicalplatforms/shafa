import { useState, useCallback } from 'react'

export interface LocationData {
  latitude: number
  longitude: number
}

export type LocationStatus = 'idle' | 'loading' | 'success' | 'error' | 'denied'

export function useLocation() {
  const [data, setData] = useState<LocationData | null>(null)
  const [status, setStatus] = useState<LocationStatus>('idle')
  const [error, setError] = useState<string | null>(null)

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setStatus('error')
      setError('Geolocation not supported')
      return
    }

    setStatus('loading')
    setError(null)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setData({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        })
        setStatus('success')
      },
      (error) => {
        const isDenied = error.code === error.PERMISSION_DENIED
        setStatus(isDenied ? 'denied' : 'error')
        setError(isDenied ? 'Location denied' : 'Location unavailable')
        setData(null)
      },
      {
        enableHighAccuracy: false,
        timeout: 15000,
        maximumAge: 0,
      }
    )
  }, [])

  const clearLocation = useCallback(() => {
    setData(null)
    setStatus('idle')
    setError(null)
  }, [])

  return { data, status, error, requestLocation, clearLocation }
}
