import { useState, useEffect, useCallback } from 'react'

export interface LocationData {
  latitude: number
  longitude: number
  accuracy?: number
}

export type LocationStatus = 'idle' | 'loading' | 'success' | 'error' | 'denied'

export interface LocationState {
  data: LocationData | null
  status: LocationStatus
  error: string | null
}

export function useLocation() {
  const [state, setState] = useState<LocationState>({
    data: null,
    status: 'idle',
    error: null,
  })

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setState(prev => ({
        ...prev,
        status: 'error',
        error: 'Geolocation is not supported by this browser',
      }))
      return
    }

    setState(prev => ({ ...prev, status: 'loading', error: null }))

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          data: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          },
          status: 'success',
          error: null,
        })
      },
      (error) => {
        let errorMessage = 'Unknown error occurred'
        let status: LocationStatus = 'error'

        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied by user'
            status = 'denied'
            break
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable'
            break
          case error.TIMEOUT:
            errorMessage = 'Location request timed out'
            break
        }

        setState({
          data: null,
          status,
          error: errorMessage,
        })
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes
      }
    )
  }, [])

  const clearLocation = useCallback(() => {
    setState({
      data: null,
      status: 'idle',
      error: null,
    })
  }, [])

  return {
    ...state,
    requestLocation,
    clearLocation,
  }
}
