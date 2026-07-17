import { HoppRESTRequest } from "@hoppscotch/data"

export const getRequestSelectionID = (
  request: HoppRESTRequest,
  path: number[]
) => request._ref_id ?? `path:${path.join("/")}`
