type Callback = () => void

interface Timer {
  t: number
  seq: number
  cb: Callback
  cancelled: boolean
}

// Discrete-event scheduler. No real setTimeout/Date.now ever touches this —
// time only advances by popping the next timer, so two runs with the same
// sequence of `schedule` calls produce bit-identical orderings.
export class Scheduler {
  private timers: Timer[] = []
  private seq = 0
  private clock = 0
  private pending = 0 // in-flight async operations the sim must wait for

  now(): number {
    return this.clock
  }

  schedule(delayMs: number, cb: Callback): () => void {
    const timer: Timer = { t: this.clock + Math.max(0, delayMs), seq: this.seq++, cb, cancelled: false }
    this.timers.push(timer)
    return () => {
      timer.cancelled = true
    }
  }

  // marks one async operation as in-flight; the run loop will not stop while
  // any such operation is unresolved, even if the timer queue is briefly empty
  trackPending<T>(promise: Promise<T>): Promise<T> {
    this.pending++
    promise.finally(() => this.pending--)
    return promise
  }

  private peekNext(): Timer | undefined {
    let best: Timer | undefined
    for (const t of this.timers) {
      if (t.cancelled) continue
      if (!best || t.t < best.t || (t.t === best.t && t.seq < best.seq)) best = t
    }
    return best
  }

  private sweepCancelled() {
    if (this.timers.length > 64 && this.timers.every((t) => t.cancelled)) this.timers = []
  }

  // Drains all scheduled work up to maxTime, or until nothing is left to do.
  // Yields a microtask turn between timers so guest `await` chains resume
  // deterministically before the clock advances again.
  async run(maxTime: number, maxTimers = 2_000_000): Promise<void> {
    let fired = 0
    for (;;) {
      const next = this.peekNext()

      if (!next) {
        this.sweepCancelled()
        if (this.pending === 0) return
        await Promise.resolve()
        continue
      }
      if (next.t > maxTime) return

      this.timers.splice(this.timers.indexOf(next), 1)
      this.clock = next.t
      next.cb()

      await Promise.resolve()
      await Promise.resolve()

      if (++fired > maxTimers) throw new Error('scheduler runaway: exceeded maxTimers')
    }
  }
}
