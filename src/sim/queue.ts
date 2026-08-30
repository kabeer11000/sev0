import { Scheduler } from '../kernel/scheduler'
import { EventLog } from '../kernel/types'

export interface Message {
  id: string
  orderId: string
  attempts: number
}

interface InFlight {
  acked: boolean
  cancelVisibility: () => void
}

// At-least-once queue with a visibility timeout: an unacked message becomes
// visible again and is redelivered. This is the delivery-semantics surface
// the checkout scenario's bug lives in.
export class SimQueue {
  private waiting: Message[] = []
  private consumers: Array<(m: Message) => void> = []
  private inFlight = new Map<string, InFlight>()
  private msgSeq = 0
  private scheduler: Scheduler
  private log: EventLog
  private visibilityTimeoutMs: number

  constructor(scheduler: Scheduler, log: EventLog, visibilityTimeoutMs = 30_000) {
    this.scheduler = scheduler
    this.log = log
    this.visibilityTimeoutMs = visibilityTimeoutMs
  }

  enqueue(orderId: string) {
    const msg: Message = { id: `m${this.msgSeq++}`, orderId, attempts: 0 }
    this.log.push(this.scheduler.now(), 'queue.enqueue', { orderId, detail: { messageId: msg.id } })
    this.dispatch(msg)
  }

  // resolves when a message is available; never tracked as "pending" —
  // an idle consumer waiting on an empty queue should not keep the sim alive
  take(): Promise<Message> {
    return new Promise((resolve) => {
      const next = this.waiting.shift()
      if (next) {
        this.deliver(next)
        resolve(next)
      } else {
        this.consumers.push(resolve)
      }
    })
  }

  ack(messageId: string) {
    const rec = this.inFlight.get(messageId)
    if (!rec || rec.acked) return
    rec.acked = true
    rec.cancelVisibility()
    this.inFlight.delete(messageId)
    this.log.push(this.scheduler.now(), 'queue.ack', { detail: { messageId } })
  }

  private dispatch(msg: Message) {
    const consumer = this.consumers.shift()
    if (consumer) {
      this.deliver(msg)
      consumer(msg)
    } else {
      this.waiting.push(msg)
    }
  }

  private deliver(msg: Message) {
    msg.attempts++
    this.log.push(this.scheduler.now(), msg.attempts > 1 ? 'queue.redeliver' : 'queue.deliver', {
      orderId: msg.orderId,
      detail: { messageId: msg.id, attempts: msg.attempts },
    })

    const cancelVisibility = this.scheduler.schedule(this.visibilityTimeoutMs, () => {
      const rec = this.inFlight.get(msg.id)
      if (!rec || rec.acked) return
      this.inFlight.delete(msg.id)
      this.log.push(this.scheduler.now(), 'queue.visibility_timeout', {
        orderId: msg.orderId,
        detail: { messageId: msg.id },
      })
      this.dispatch(msg)
    })

    this.inFlight.set(msg.id, { acked: false, cancelVisibility })
  }
}
