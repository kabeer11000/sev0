// Compiles editable scenario code into a callable handler. Guest code runs
// in-realm as plain JS (no sandboxing) — a known relaxation from the
// architecture doc's QuickJS-in-wasm design, acceptable for a local
// single-player prototype but not for hosting untrusted submissions.
export function compileHandler<T extends (...args: never[]) => Promise<unknown>>(code: string): T {
  try {
    const factory = new Function(`"use strict";\n${code}\nreturn handle;`)
    const fn = factory()
    if (typeof fn !== 'function') throw new Error('code must define an async function named "handle"')
    return fn as T
  } catch (err) {
    throw new CompileError(err instanceof Error ? err.message : String(err))
  }
}

export class CompileError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CompileError'
  }
}
