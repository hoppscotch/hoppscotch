/**
 * JSON Parser WebWorker
 * Handles heavy JSON parsing and validation off the main thread
 * to prevent UI blocking during response rendering
 */

import * as LJSON from 'lossless-json'
import { JSONValue } from '~/helpers/jsonParse'

type WorkerMessage =
  | {
      type: 'parse'
      id: string
      data: string
      useLossless?: boolean
    }
  | {
      type: 'stringify'
      id: string
      data: JSONValue
      useLossless?: boolean
    }

type WorkerResponse =
  | {
      type: 'success'
      id: string
      result: any
    }
  | {
      type: 'error'
      id: string
      error: string
    }

// Handle messages from main thread
self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const { type, id } = event.data

  try {
    if (type === 'parse') {
      const { data, useLossless } = event.data
      
      let result
      if (useLossless) {
        result = LJSON.parse(data)
      } else {
        result = JSON.parse(data)
      }

      const response: WorkerResponse = {
        type: 'success',
        id,
        result,
      }
      self.postMessage(response)
    } else if (type === 'stringify') {
      const { data, useLossless } = event.data
      
      let result
      if (useLossless) {
        result = LJSON.stringify(data, undefined, 2)
      } else {
        result = JSON.stringify(data, null, 2)
      }

      const response: WorkerResponse = {
        type: 'success',
        id,
        result,
      }
      self.postMessage(response)
    }
  } catch (error) {
    const response: WorkerResponse = {
      type: 'error',
      id,
      error: error instanceof Error ? error.message : String(error),
    }
    self.postMessage(response)
  }
}
