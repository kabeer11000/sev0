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
    monaco.editor.defineTheme('sev0-light', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '998d7b', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'c4552f' },
        { token: 'string', foreground: '3d8a5a' },
        { token: 'number', foreground: 'a96d10' },
        { token: 'type', foreground: '7c4ea8' },
      ],
      colors: {
        'editor.background': '#ffffff',
        'editor.foreground': '#2b241c',
        'editorLineNumber.foreground': '#998d7b',
        'editorLineNumber.activeForeground': '#6b6053',
        'editor.lineHighlightBackground': '#f5d8c8',
        'editor.lineHighlightBorder': '#f5d8c8',
        'editor.selectionBackground': '#f5d8c8',
        'editor.inactiveSelectionBackground': '#fbe9df',
        'editorCursor.foreground': '#e26d44',
        'editorIndentGuide.background': '#ebe3d6',
        'editorIndentGuide.activeBackground': '#d6ccba',
        'editor.findMatchBackground': '#fbecd0',
        'editor.findMatchHighlightBackground': '#fbecd0',
        'editorBracketMatch.background': '#fbecd0',
        'editorBracketMatch.border': '#c98715',
        'scrollbarSlider.background': '#d6ccbab0',
        'scrollbarSlider.hoverBackground': '#998d7b',
        'scrollbarSlider.activeBackground': '#6b6053',
      },
    })
  })
}
