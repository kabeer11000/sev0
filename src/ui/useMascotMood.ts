import { useEffect, useRef, useState } from 'react'
import { useSev0Store } from '../store'
import type { MascotState } from './Mascot'

/**
 * Drives the mascot mood based on editor activity + time pressure.
 *
 * Priority (highest first):
 *   1. isSubmitting        → scared
 *   2. overtime            → panicked
 *   3. recent failed submit → sad
 *   4. solution just revealed → disappointed
 *   5. hint just revealed  → curious
 *   6. edited in last 5s   → excited
 *   7. pct < 25%           → worried
 *   8. pct < 50%           → alert
 *   9. idle 2min+          → sleepy
 *  10. idle 30s+           → bored
 *  11. default             → happy
 */
export function useMascotMood(): {
  mood: MascotState
  pctRemaining: number
  overtime: boolean
  remaining: number
} {
  const code = useSev0Store((s) => s.code)
  const lastRun = useSev0Store((s) => s.lastRun)
  const submitResult = useSev0Store((s) => s.submitResult)
  const solutionRevealed = useSev0Store((s) => s.solutionRevealed)
  const hintsRevealedLen = useSev0Store((s) => s.hintsRevealed)
  const isSubmitting = useSev0Store((s) => s.isSubmitting)
  const taskStartedAt = useSev0Store((s) => s.taskStartedAt)
  const scenario = useSev0Store((s) => s.scenario)

  const [now, setNow] = useState(() => Date.now())

  // timestamps for each "activity" signal
  const lastEditAtRef = useRef<number>(Date.now())
  const lastRunAtRef = useRef<number | null>(null)
  const lastSubmitAtRef = useRef<number | null>(null)
  const lastHintAtRef = useRef<number | null>(null)
  const lastSolutionAtRef = useRef<number | null>(null)
  const prevHintsLenRef = useRef<number>(hintsRevealedLen)
  const prevSolutionRef = useRef<boolean>(solutionRevealed)
  const isFirstRender = useRef(true)

  useEffect(() => {
    if (isFirstRender.current) return
    lastEditAtRef.current = Date.now()
  }, [code])

  useEffect(() => {
    if (isFirstRender.current) return
    lastRunAtRef.current = Date.now()
  }, [lastRun])

  useEffect(() => {
    if (isFirstRender.current) return
    lastSubmitAtRef.current = Date.now()
  }, [submitResult])

  useEffect(() => {
    if (hintsRevealedLen > prevHintsLenRef.current) {
      lastHintAtRef.current = Date.now()
    }
    prevHintsLenRef.current = hintsRevealedLen
  }, [hintsRevealedLen])

  useEffect(() => {
    if (solutionRevealed && !prevSolutionRef.current) {
      lastSolutionAtRef.current = Date.now()
    }
    prevSolutionRef.current = solutionRevealed
  }, [solutionRevealed])

  // flip the first-render gate AFTER initial effect runs
  useEffect(() => {
    isFirstRender.current = false
  }, [])

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const remaining = scenario.timeLimitMs - (now - taskStartedAt)
  const overtime = remaining < 0
  const pctRemaining = Math.max(0, Math.min(1, remaining / scenario.timeLimitMs))
  const sinceEdit = now - lastEditAtRef.current

  let mood: MascotState = 'happy'

  if (isSubmitting) {
    mood = 'scared'
  } else if (overtime) {
    mood = 'panicked'
  } else if (
    lastSubmitAtRef.current !== null &&
    now - lastSubmitAtRef.current < 30_000 &&
    submitResult &&
    !submitResult.passed
  ) {
    mood = 'sad'
  } else if (lastSolutionAtRef.current !== null && now - lastSolutionAtRef.current < 30_000) {
    mood = 'disappointed'
  } else if (lastHintAtRef.current !== null && now - lastHintAtRef.current < 15_000) {
    mood = 'curious'
  } else if (sinceEdit < 5_000) {
    mood = 'excited'
  } else if (pctRemaining < 0.25) {
    mood = 'worried'
  } else if (pctRemaining < 0.5) {
    mood = 'alert'
  } else if (sinceEdit > 120_000) {
    mood = 'sleepy'
  } else if (sinceEdit > 30_000) {
    mood = 'bored'
  }

  return { mood, pctRemaining, overtime, remaining }
}