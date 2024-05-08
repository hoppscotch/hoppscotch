import { HoppRESTRequest } from "@hoppscotch/data"
import { HoppRESTResponse } from "../types/HoppRESTResponse"
import { HoppTestResult } from "../types/HoppTestResult"
import { RESTOptionTabs } from "~/components/http/RequestOptions.vue"
import { HoppInheritedProperty } from "../types/HoppInheritedProperties"
import { Handle } from "~/services/new-workspace/handle"
import { WorkspaceRequest } from "~/services/new-workspace/workspace"

export type HoppRESTSaveContext =
  | {
      /**
       * The origin source of the request
       */
      // TODO: Make this `user-collection` after porting all usages
      originLocation: "workspace-user-collection"
      /**
       * ID of the workspace
       */
      workspaceID?: string

      /**
       * ID of the provider
       */
      providerID?: string

      /**
       * Path to the request in the collection tree
       */
      requestID?: string

      /**
       * Handle to the request open in the tab
       */
      requestHandle?: Handle<WorkspaceRequest>
    }
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

/**
 * Defines a live 'document' (something that is open and being edited) in the app
 */
export type HoppRESTDocument = {
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

  /**
   * The inherited properties from the parent collection
   * (if any)
   */
  inheritedProperties?: HoppInheritedProperty
}
