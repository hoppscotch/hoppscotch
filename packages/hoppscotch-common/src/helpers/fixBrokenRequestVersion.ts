import {
  getDefaultRESTRequest,
  safelyExtractRESTRequest,
} from "@hoppscotch/data"
import { z } from "zod"
import { REST_TAB_STATE_SCHEMA } from "~/services/persistence/validation-schemas"

type HoppRESTab = z.infer<typeof REST_TAB_STATE_SCHEMA>

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
      x.doc.request = safelyExtractRESTRequest(
        x.doc.request,
        getDefaultRESTRequest()
      )

      if (x.doc.resultCollection) {
        x.doc.resultCollection.requests = x.doc.resultCollection?.requests.map(
          (req) => {
            return safelyExtractRESTRequest(req, getDefaultRESTRequest())
          }
        )
      }
    }

    return x
  })
}
