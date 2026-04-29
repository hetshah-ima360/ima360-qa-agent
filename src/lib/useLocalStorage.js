import { useState, useEffect, useRef } from 'react'

/**
 * useLocalStorage — drop-in replacement for useState that persists to localStorage.
 *
 * Behavior:
 * - Reads the initial value from localStorage on mount (falls back to defaultValue if missing or unparseable)
 * - Writes the value to localStorage whenever it changes
 * - Safe across tabs: if another tab updates the same key, this hook picks up the change via the 'storage' event
 * - SSR-safe: does not touch window during initial render
 *
 * Usage:
 *   const [desc, setDesc] = useLocalStorage('diagnose:desc', '')
 *
 * To clear:
 *   setDesc('')   // becomes empty string in storage
 *   localStorage.removeItem('diagnose:desc')   // fully removes the key
 */
export function useLocalStorage(key, defaultValue) {
  const isFirstRender = useRef(true)

  const [value, setValue] = useState(() => {
    if (typeof window === 'undefined') return defaultValue
    try {
      const raw = window.localStorage.getItem(key)
      if (raw === null) return defaultValue
      return JSON.parse(raw)
    } catch {
      return defaultValue
    }
  })

  // Persist to localStorage on change (skip the very first render to avoid a no-op write)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    try {
      if (value === undefined || value === null) {
        window.localStorage.removeItem(key)
      } else {
        window.localStorage.setItem(key, JSON.stringify(value))
      }
    } catch {
      // localStorage might be full or disabled; fail silently rather than crash the app
    }
  }, [key, value])

  // Cross-tab sync: if another tab changes this key, update local state
  useEffect(() => {
    function onStorage(e) {
      if (e.key !== key) return
      try {
        setValue(e.newValue === null ? defaultValue : JSON.parse(e.newValue))
      } catch {
        // ignore malformed values from other tabs
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [key, defaultValue])

  return [value, setValue]
}

/**
 * clearDiagnoseStorage — utility to wipe all Diagnose-related localStorage keys.
 * Use when the user explicitly wants to start over.
 */
export function clearDiagnoseStorage() {
  ['diagnose:input', 'diagnose:result'].forEach(k => {
    try { window.localStorage.removeItem(k) } catch {}
  })
}
