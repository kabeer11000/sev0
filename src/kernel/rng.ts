// Seeded PRNG. Deterministic across platforms — mulberry32 only uses uint32 ops.
export class Rng {
  private state: number

  constructor(seed: number) {
    this.state = seed >>> 0
  }

  // returns a float in [0, 1)
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0
    let t = this.state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  int(maxExclusive: number): number {
    return Math.floor(this.next() * maxExclusive)
  }

  pick<T>(arr: readonly T[]): T {
    return arr[this.int(arr.length)]
  }

  // exponential inter-arrival time for a poisson process at `rate` per second
  exponential(rate: number): number {
    const u = Math.max(this.next(), 1e-12)
    return -Math.log(u) / rate
  }

  // lognormal-ish latency: a floor plus a heavy right tail, in milliseconds
  latency(p50Ms: number, tailFactor = 6): number {
    const u = Math.max(this.next(), 1e-12)
    const mu = Math.log(p50Ms)
    const sigma = Math.log(tailFactor) / 2
    const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * this.next())
    return Math.max(1, Math.exp(mu + sigma * z))
  }

  bool(pTrue: number): boolean {
    return this.next() < pTrue
  }
}
