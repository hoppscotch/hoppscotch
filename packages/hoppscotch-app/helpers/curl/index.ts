import { flow } from "fp-ts/function"
import cloneDeep from "lodash/cloneDeep"
import { parseCurlCommand } from "./curlparser"

export const parseCurlToHoppRESTReq = flow(parseCurlCommand, cloneDeep)
