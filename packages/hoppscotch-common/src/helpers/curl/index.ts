import { flow } from "fp-ts/function"
import { cloneDeep } from "es-toolkit/compat"
import { parseCurlCommand } from "./curlparser"

export const parseCurlToHoppRESTReq = flow(parseCurlCommand, cloneDeep)
