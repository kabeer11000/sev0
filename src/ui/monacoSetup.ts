import { loader } from '@monaco-editor/react'
import { SDK_DTS } from '../scenario/filesystem'

let started = false

// Registers the SDK's ambient types once, globally, so "ctx." autocompletes
// and hovers with real signatures in handler.ts / consume.ts — without the
// executed code needing an import (it has no module system at runtime).
export function ensureMonacoSdkTypes() {
  if (started) return
  started = true
  loader.init().then((monaco) => {
    monaco.languages.typescript.typescriptDefaults.addExtraLib(SDK_DTS, 'ts:sev0/sdk.d.ts')
  })
}
