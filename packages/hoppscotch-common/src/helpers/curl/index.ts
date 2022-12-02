import { flow } from "fp-ts/function"
import { cloneDeep } from "lodash-es"
import { parseCurlCommand } from "./curlparser"

export const parseCurlToHoppRESTReq = flow(parseCurlCommand, cloneDeep)
