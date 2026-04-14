'use client'

import { useEffect, useRef, useCallback } from 'react'

interface SoundPreferences {
  soundEnabled: boolean
  highPrioritySoundEnabled: boolean
}

const DEFAULT_PREFS: SoundPreferences = {
  soundEnabled: true,
  highPrioritySoundEnabled: true,
}

const STORAGE_KEY = 'mg-sound-prefs'

function loadSoundPrefs(): SoundPreferences {
  if (typeof window === 'undefined') return DEFAULT_PREFS
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_PREFS
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_PREFS
  }
}

export function saveSoundPrefs(prefs: Partial<SoundPreferences>) {
  if (typeof window === 'undefined') return
  const current = loadSoundPrefs()
  const updated = { ...current, ...prefs }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
}

export function getSoundPrefs(): SoundPreferences {
  return loadSoundPrefs()
}

// High-priority alert tracking for repeating cadence
type TrackerSound = 'alert' | 'sos-response'

interface AlertTracker {
  playCount: number
  firstPlayed: number
  acknowledged: boolean
  sound: TrackerSound
}

const REPEAT_INTERVAL_MS = 2 * 60 * 1000 // 2 minutes
const MAX_PLAYS = 3
const CHECK_INTERVAL_MS = 30 * 1000 // check every 30 seconds

export function useNotificationSound() {
  const standardRef = useRef<HTMLAudioElement | null>(null)
  const alertRef = useRef<HTMLAudioElement | null>(null)
  const sosResponseRef = useRef<HTMLAudioElement | null>(null)
  const alertTrackers = useRef<Map<string, AlertTracker>>(new Map())
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Preload audio on mount
  useEffect(() => {
    const standard = new Audio('/sounds/notification.wav')
    standard.preload = 'auto'
    standard.volume = 0.5
    standardRef.current = standard

    const alert = new Audio('/sounds/alert.wav')
    alert.preload = 'auto'
    alert.volume = 0.6
    alertRef.current = alert

    const sosResponse = new Audio('/sounds/sos-response.wav')
    sosResponse.preload = 'auto'
    sosResponse.volume = 0.65
    sosResponseRef.current = sosResponse

    // Start interval for repeating high-priority alerts
    intervalRef.current = setInterval(() => {
      const prefs = loadSoundPrefs()
      if (!prefs.highPrioritySoundEnabled) return

      const now = Date.now()
      alertTrackers.current.forEach((tracker) => {
        if (tracker.acknowledged) return
        if (tracker.playCount >= MAX_PLAYS) return

        const elapsed = now - tracker.firstPlayed
        const nextPlayAt = tracker.playCount * REPEAT_INTERVAL_MS
        if (elapsed >= nextPlayAt) {
          tracker.playCount++
          const audio =
            tracker.sound === 'sos-response' ? sosResponseRef.current : alertRef.current
          audio?.play().catch(() => {})
        }
      })
    }, CHECK_INTERVAL_MS)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  const playStandard = useCallback(() => {
    const prefs = loadSoundPrefs()
    if (!prefs.soundEnabled) return
    standardRef.current?.play().catch(() => {})
  }, [])

  const playHighPriority = useCallback((notificationId?: string) => {
    const prefs = loadSoundPrefs()
    if (!prefs.highPrioritySoundEnabled) return
    alertRef.current?.play().catch(() => {})

    // Track for repeating cadence
    if (notificationId && !alertTrackers.current.has(notificationId)) {
      alertTrackers.current.set(notificationId, {
        playCount: 1,
        firstPlayed: Date.now(),
        acknowledged: false,
        sound: 'alert',
      })
    }
  }, [])

  const playSosResponse = useCallback((notificationId?: string) => {
    const prefs = loadSoundPrefs()
    // SOS response is the most time-sensitive notification on the platform.
    // It rides the high-priority preference toggle so users who muted that
    // category also mute SOS response, but it plays its own distinct tone
    // and gets tracked for the repeating cadence.
    if (!prefs.highPrioritySoundEnabled) return
    sosResponseRef.current?.play().catch(() => {})

    if (notificationId && !alertTrackers.current.has(notificationId)) {
      alertTrackers.current.set(notificationId, {
        playCount: 1,
        firstPlayed: Date.now(),
        acknowledged: false,
        sound: 'sos-response',
      })
    }
  }, [])

  const acknowledgeAlert = useCallback((notificationId: string) => {
    const tracker = alertTrackers.current.get(notificationId)
    if (tracker) {
      tracker.acknowledged = true
    }
  }, [])

  const acknowledgeAllAlerts = useCallback(() => {
    alertTrackers.current.forEach((tracker) => {
      tracker.acknowledged = true
    })
  }, [])

  return {
    playStandard,
    playHighPriority,
    playSosResponse,
    acknowledgeAlert,
    acknowledgeAllAlerts,
  }
}
