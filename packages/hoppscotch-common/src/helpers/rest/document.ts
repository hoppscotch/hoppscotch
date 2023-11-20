import { HoppCollection, HoppRESTRequest } from "@hoppscotch/data"
import { HoppRESTResponse } from "../types/HoppRESTResponse"
import { HoppTestResult } from "../types/HoppTestResult"
import { RESTOptionTabs } from "~/components/http/RequestOptions.vue"

export type HoppRESTSaveContext =
  | {
      /**
       * The origin source of the request
       */
      originLocation: "user-collection"
      /**
       * Path to the request folder
       */
      folderPath: string
      /**
       * Index to the request
       */
      requestIndex: number
    }
  | {
      /**
       * The origin source of the request
       */
      originLocation: "team-collection"
      /**
       * ID of the request in the team
       */
      requestID: string
      /**
       * ID of the team
       */
      teamID?: string
      /**
       * ID of the collection loaded
       */
      collectionID?: string
    }
  | null

export type HoppCollectionSaveContext =
  | {
      /**
       * The origin source of the request
       */
      originLocation: "user-collection"
      /**
       * Path to the request folder
       */
      folderPath: string
    }
  | {
      /**
       * The origin source of the request
       */
      originLocation: "team-collection"
      /**
       * ID of the team
       */
      teamID?: string
      /**
       * ID of the collection loaded
       */
      collectionID?: string
      /**
       * ID of the request in the team
       */
      requestID: string
    }
  | null

export type HoppCollectionDocument = {
  /**
   * The document type
   */
  type: "collection"
  /**
   * The collection as it is in the document
   */
  collection: HoppCollection<HoppRESTRequest>
  /**
   * Info about where this request should be saved.
   * This contains where the request is originated from basically.
   */
  saveContext?: HoppCollectionSaveContext
  /**
   * Whether the request has any unsaved changes
   * (atleast as far as we can say)
   */
  isDirty: boolean
}

export type HoppRequestDocument = {
  /**
   * The document type
   */
  type: "request"

  /**
   * The request as it is in the document
   */
  request: HoppRESTRequest

  /**
   * Whether the request has any unsaved changes
   * (atleast as far as we can say)
   */
  isDirty: boolean

  /**
   * Info about where this request should be saved.
   * This contains where the request is originated from basically.
   */
  saveContext?: HoppRESTSaveContext

  /**
   * The response as it is in the document
   * (if any)
   */
  response?: HoppRESTResponse | null

  /**
   * The test results as it is in the document
   * (if any)
   */
  testResults?: HoppTestResult | null

  /**
   * Response tab preference for the current tab's document
   */
  responseTabPreference?: string

  /**
   * Options tab preference for the current tab's document
   */
  optionTabPreference?: RESTOptionTabs
}

/**
 * Defines a live 'document' (something that is open and being edited) in the app
 */
export type HoppRESTDocument = HoppCollectionDocument | HoppRequestDocument
