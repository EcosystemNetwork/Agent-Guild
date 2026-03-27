import { useState, useEffect } from 'react'
import type { AsyncState } from '../types'

/**
 * Simulates async data loading from fixture data.
 * Returns loading/error/data states for UI state handling.
 */
export function useAsyncData<T>(
  fetcher: () => T,
  delay = 600,
): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    isLoading: true,
    error: null,
  })

  useEffect(() => {
    setState({ data: null, isLoading: true, error: null })
    const timer = setTimeout(() => {
      try {
        const data = fetcher()
        setState({ data, isLoading: false, error: null })
      } catch (e) {
        setState({
          data: null,
          isLoading: false,
          error: e instanceof Error ? e.message : 'Unknown error',
        })
      }
    }, delay)
    return () => clearTimeout(timer)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return state
}
