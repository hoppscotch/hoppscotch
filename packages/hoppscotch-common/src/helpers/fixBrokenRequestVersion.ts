import {
  getDefaultRESTRequest,
  safelyExtractRESTRequest,
} from "@hoppscotch/data"
import { z } from "zod"
import { WORKSPACE_TABS_STATE_SCHEMA } from "~/services/persistence/validation-schemas"

type HoppRESTab = z.infer<typeof WORKSPACE_TABS_STATE_SCHEMA>

/**
 * Fixes broken request versions in the given REST tab documents.
 * This function ensures that all requests and test runners have valid
 * request data, defaulting to the default REST request structure if necessary.
 *
 * There were requests in the REST tab that had an invalid version
 * structure, with response and parent request which could lead to issues when trying to access or
 * manipulate those requests. This function iterates through the
 * ordered documents of the REST tab and checks each request.
 *
 * @param docs - The ordered documents of the REST tab to fix.
 * @returns The fixed ordered documents with valid request structures.
 */
export const fixBrokenRequestVersion = (
  docs: HoppRESTab["orderedDocs"]
): HoppRESTab["orderedDocs"] => {
  return docs.map((x: HoppRESTab["orderedDocs"][number]) => {
    if (x.doc.type === "request") {
      const req = safelyExtractRESTRequest(
        x.doc.request,
        getDefaultRESTRequest()
      )
      if (req) {
        x.doc.request = req
      }
    }

    if (x.doc.type === "test-runner") {
      // Runner docs persist `request: null` deliberately. Resurrecting the
      // null into a default request lets a runner doc with an invalid
      // collection satisfy the tab-state union's request-tab branch and
      // silently morph into a blank request tab — only sanitize a request
      // that actually exists. A missing key is normalized to null: the tab
      // schema accepts null but not undefined.
      if (x.doc.request === null || x.doc.request === undefined) {
        x.doc.request = null
      } else {
        x.doc.request = safelyExtractRESTRequest(
          x.doc.request,
          getDefaultRESTRequest()
        )
      }

      if (x.doc.resultCollection) {
        x.doc.resultCollection.requests = x.doc.resultCollection?.requests.map(
          (req) => {
            return safelyExtractRESTRequest(req, getDefaultRESTRequest())
          }
        )
      }

      // Run results are no longer persisted, but an earlier build's state can
      // still carry per-iteration result trees whose stale requests would
      // fail schema validation and take the whole tab state down — drop them.
      if ("iterationResults" in x.doc) {
        x.doc.iterationResults = undefined
      }
    }

    return x
  })
}
