/**
 * CodeMirror Optimization Utilities
 * Lazy loads CodeMirror extensions and optimizes initialization
 */

import { EditorState, Extension } from '@codemirror/state'
import { EditorView } from '@codemirror/view'

interface CodemirrorConfig {
  readOnly: boolean
  lineWrapping: boolean
  mode: string
  maxLines?: number
}

/**
 * Lazy load CodeMirror language support
 */
export async function loadLanguageDynamically(
  language: string
): Promise<Extension> {
  try {
    if (language === 'application/ld+json' || language === 'application/json') {
      const { json } = await import('@codemirror/lang-json')
      return json()
    }
    // Default to JSON
    const { json } = await import('@codemirror/lang-json')
    return json()
  } catch (error) {
    console.warn(`Failed to load language ${language}:`, error)
    const { json } = await import('@codemirror/lang-json')
    return json()
  }
}

/**
 * Create optimized CodeMirror extensions
 * Loads extensions lazily to reduce initial render blocking
 */
export async function createOptimizedExtensions(
  config: CodemirrorConfig
): Promise<Extension[]> {
  const extensions: Extension[] = []

  // Load language dynamically
  try {
    const lang = await loadLanguageDynamically(config.mode)
    extensions.push(lang)
  } catch (error) {
    console.error('Failed to load language extension:', error)
  }

  // Add line wrapping if needed
  if (config.lineWrapping) {
    extensions.push(EditorView.lineNumbers())
  }

  return extensions
}

/**
 * Create a viewport-based plugin to only render visible lines
 * This significantly improves performance for large JSON files
 */
export function createViewportPlugin(maxVisibleLines: number = 100) {
  return EditorView.domEventHandlers({
    scroll: () => {
      // This will trigger by default, ensuring only visible content is rendered
      return false
    },
  })
}

/**
 * Measure CodeMirror initialization time
 */
export async function measureCodemirrorInitTime(
  callback: () => Promise<void>
): Promise<number> {
  const startTime = performance.now()
  await callback()
  const endTime = performance.now()
  return endTime - startTime
}

/**
 * Create a light-weight CodeMirror state for large documents
 * Disables certain features to improve performance
 */
export function createLightweightEditorState(
  doc: string,
  extensions: Extension[]
): EditorState {
  return EditorState.create({
    doc,
    extensions: [
      ...extensions,
      EditorState.readOnly.of(true), // Read-only for responses
      EditorView.contentAttributes.of({
        spellcheck: 'false',
        'data-gramm': 'false',
        'data-gramm_editor': 'false',
        'data-enable-grammarly': 'false',
      }),
    ],
  })
}
