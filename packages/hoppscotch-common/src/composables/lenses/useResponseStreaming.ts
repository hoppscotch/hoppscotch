/**
 * Response Streaming Parser
 * Handles streaming/chunked parsing of large JSON responses
 */

import { ref, computed } from 'vue'

interface StreamingState {
  bufferedData: string
  isStreaming: boolean
  streamProgress: number
  totalReceived: number
}

/**
 * Composable for streaming JSON response parsing
 * Useful when responses are received in chunks
 */
export function useResponseStreaming() {
  const state = ref<StreamingState>({
    bufferedData: '',
    isStreaming: false,
    streamProgress: 0,
    totalReceived: 0,
  })

  /**
   * Append chunk to buffer
   */
  const appendChunk = (chunk: string, totalSize?: number) => {
    state.value.bufferedData += chunk
    state.value.totalReceived += chunk.length

    if (totalSize) {
      state.value.streamProgress = Math.round(
        (state.value.totalReceived / totalSize) * 100
      )
    }
  }

  /**
   * Start streaming
   */
  const startStreaming = () => {
    state.value.isStreaming = true
    state.value.bufferedData = ''
    state.value.streamProgress = 0
    state.value.totalReceived = 0
  }

  /**
   * End streaming
   */
  const endStreaming = () => {
    state.value.isStreaming = false
    state.value.streamProgress = 100
  }

  /**
   * Get buffered data as string
   */
  const getBufferedData = (): string => {
    return state.value.bufferedData
  }

  /**
   * Try to extract complete JSON from buffer
   * Useful for ndjson or streaming JSON responses
   */
  const tryExtractCompleteJSON = (): {
    json: string | null
    remaining: string
  } => {
    const data = state.value.bufferedData

    // Check if we have a complete JSON object/array
    let braceCount = 0
    let bracketCount = 0
    let inString = false
    let escapeNext = false
    let endIndex = -1

    for (let i = 0; i < data.length; i++) {
      const char = data[i]

      if (escapeNext) {
        escapeNext = false
        continue
      }

      if (char === '\\') {
        escapeNext = true
        continue
      }

      if (char === '"') {
        inString = !inString
        continue
      }

      if (inString) continue

      if (char === '{') braceCount++
      else if (char === '}') braceCount--
      else if (char === '[') bracketCount++
      else if (char === ']') bracketCount--

      if (braceCount === 0 && bracketCount === 0 && braceCount + bracketCount > 0) {
        endIndex = i + 1
        break
      }
    }

    if (endIndex === -1) {
      return { json: null, remaining: data }
    }

    const json = data.substring(0, endIndex)
    const remaining = data.substring(endIndex).trim()

    // Update buffer with remaining data
    state.value.bufferedData = remaining

    return { json, remaining }
  }

  /**
   * Reset streaming state
   */
  const reset = () => {
    state.value = {
      bufferedData: '',
      isStreaming: false,
      streamProgress: 0,
      totalReceived: 0,
    }
  }

  return {
    state: computed(() => state.value),
    appendChunk,
    startStreaming,
    endStreaming,
    getBufferedData,
    tryExtractCompleteJSON,
    reset,
  }
}

/**
 * Parse ndjson (newline delimited JSON) stream
 */
export function parseNDJSON(data: string): any[] {
  const lines = data.split('\n').filter((line) => line.trim())
  return lines.map((line) => {
    try {
      return JSON.parse(line)
    } catch (error) {
      console.warn('Failed to parse NDJSON line:', line)
      return null
    }
  })
}
