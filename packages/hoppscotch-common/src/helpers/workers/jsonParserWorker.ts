/**
 * JSON Parser Worker Utility
 * Manages communication with JSON parsing WebWorker
 * Provides Promise-based API for background JSON operations
 */

let workerInstance: Worker | null = null
let messageIdCounter = 0
const pendingRequests = new Map<
  string,
  {
    resolve: (value: any) => void
    reject: (error: Error) => void
  }
>()

/**
 * Initialize the WebWorker for JSON parsing
 */
function initializeWorker(): Worker {
  if (workerInstance) {
    return workerInstance
  }

  try {
    // Use a Web Worker for JSON processing
    workerInstance = new Worker(
      new URL('./jsonParser.worker.ts', import.meta.url),
      { type: 'module' }
    )

    // Handle responses from worker
    workerInstance.onmessage = (event: MessageEvent) => {
      const { type, id, result, error } = event.data

      const pending = pendingRequests.get(id)
      if (!pending) return

      pendingRequests.delete(id)

      if (type === 'success') {
        pending.resolve(result)
      } else {
        pending.reject(new Error(error))
      }
    }

    workerInstance.onerror = (error) => {
      console.error('Worker error:', error)
      // Reject all pending requests on worker error
      for (const [, pending] of pendingRequests) {
        pending.reject(new Error('Worker crashed'))
      }
      pendingRequests.clear()
      workerInstance = null
    }

    return workerInstance
  } catch (error) {
    // Worker support not available, return null
    console.warn('WebWorker not available:', error)
    return null as any
  }
}

/**
 * Safely send a message to the worker
 */
function sendToWorker(message: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const id = `msg-${++messageIdCounter}`

    // Store the request handlers
    pendingRequests.set(id, { resolve, reject })

    try {
      const worker = initializeWorker()
      if (!worker) {
        // Fallback if worker is not available
        pendingRequests.delete(id)
        reject(new Error('WebWorker not available'))
        return
      }

      worker.postMessage({ ...message, id })

      // Set a timeout to prevent hanging requests
      setTimeout(() => {
        if (pendingRequests.has(id)) {
          pendingRequests.delete(id)
          reject(new Error('Worker request timeout'))
        }
      }, 30000) // 30 second timeout
    } catch (error) {
      pendingRequests.delete(id)
      reject(error)
    }
  })
}

/**
 * Parse JSON string using WebWorker
 */
export async function parseJSONAsync(
  data: string,
  useLossless: boolean = true
): Promise<any> {
  try {
    return await sendToWorker({
      type: 'parse',
      data,
      useLossless,
    })
  } catch (error) {
    // Fallback to main thread parsing if worker fails
    console.warn('Falling back to main thread JSON parsing:', error)
    if (useLossless) {
      const LJSON = await import('lossless-json')
      return LJSON.parse(data)
    }
    return JSON.parse(data)
  }
}

/**
 * Stringify JSON using WebWorker
 */
export async function stringifyJSONAsync(
  data: any,
  useLossless: boolean = true
): Promise<string> {
  try {
    return await sendToWorker({
      type: 'stringify',
      data,
      useLossless,
    })
  } catch (error) {
    // Fallback to main thread stringification if worker fails
    console.warn('Falling back to main thread JSON stringification:', error)
    if (useLossless) {
      const LJSON = await import('lossless-json')
      return LJSON.stringify(data, undefined, 2)
    }
    return JSON.stringify(data, null, 2)
  }
}

/**
 * Terminate the WebWorker
 */
export function terminateWorker(): void {
  if (workerInstance) {
    workerInstance.terminate()
    workerInstance = null
    pendingRequests.clear()
  }
}
