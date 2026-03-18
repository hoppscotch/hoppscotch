import {
  HoppRESTAuth,
  HoppRESTHeaders,
  HoppRESTParams,
  HoppRESTReqBody,
  HoppRESTRequest,
} from "@hoppscotch/data"
import { cloneDeep } from "lodash"

export const getRequestSetterMethods = (request: HoppRESTRequest) => {
  // Clone to allow safe mutations internally
  const updatedRequest = <HoppRESTRequest>cloneDeep(request)

  // Mutation methods
  const setUrl = (url: string) => {
    updatedRequest.endpoint = url
  }

  const setMethod = (method: string) => {
    // NOTE: Postman does NOT normalize method to uppercase, so we preserve the original case
    updatedRequest.method = method
  }
  const setHeader = (name: string, value: string) => {
    const headers = [...updatedRequest.headers]
    const headerIndex = headers.findIndex(
      (h) => h.key.toLowerCase() === name.toLowerCase()
    )

    if (headerIndex >= 0) {
      headers[headerIndex].value = value
    } else {
      headers.push({ key: name, value, active: true, description: "" })
    }

    updatedRequest.headers = headers
  }

  const setHeaders = (headers: HoppRESTHeaders) => {
    const parseResult = HoppRESTHeaders.safeParse(headers)

    if (!parseResult.success) {
      throw new Error("Invalid headers object")
    }

    updatedRequest.headers = parseResult.data
  }

  const removeHeader = (key: string) => {
    updatedRequest.headers = updatedRequest.headers.filter(
      (h) => h.key.toLowerCase() !== key.toLowerCase()
    )
  }

  const setParam = (name: string, value: string) => {
    const params = [...updatedRequest.params]
    const paramIndex = params.findIndex(
      (p) => p.key.toLowerCase() === name.toLowerCase()
    )

    if (paramIndex >= 0) {
      params[paramIndex].value = value
    } else {
      params.push({ key: name, value, active: true, description: "" })
    }

    updatedRequest.params = params
  }

  const setParams = (params: HoppRESTParams) => {
    const parseResult = HoppRESTParams.safeParse(params)

    if (!parseResult.success) {
      throw new Error("Invalid params object")
    }

    updatedRequest.params = parseResult.data
  }

  const removeParam = (key: string) => {
    updatedRequest.params = updatedRequest.params.filter((h) => h.key !== key)
  }

  const setBody = (newBody: Partial<HoppRESTReqBody>) => {
    // Runtime validations given the input is user controlled
    if (
      typeof newBody !== "object" ||
      newBody === null ||
      Array.isArray(newBody) ||
      Object.keys(newBody).length === 0
    ) {
      throw new Error(
        "Invalid body object. Expected a non-empty object with valid body properties."
      )
    }

    const mergedBody = { ...updatedRequest.body, ...newBody }

    const parseResult = HoppRESTReqBody.safeParse(mergedBody)

    if (!parseResult.success) {
      throw new Error(
        "Invalid body object. Expected a non-empty object with valid body properties."
      )
    }

    updatedRequest.body = { ...parseResult.data }
  }

  const setAuth = (newAuth: HoppRESTAuth) => {
    // Runtime validations given the input is user controlled
    if (
      typeof newAuth !== "object" ||
      newAuth === null ||
      Array.isArray(newAuth) ||
      Object.keys(newAuth).length === 0
    ) {
      throw new Error("Invalid auth object")
    }

    const mergedAuth = { ...updatedRequest.auth, ...newAuth }

    const parseResult = HoppRESTAuth.safeParse(mergedAuth)

    if (!parseResult.success) {
      throw new Error("Invalid auth object")
    }

    updatedRequest.auth = { ...parseResult.data }
  }

  const setRequestVariable = (key: string, value: string) => {
    const reqVarIndex = updatedRequest.requestVariables.findIndex(
      (reqVar) => reqVar.key === key
    )

    if (reqVarIndex >= 0) {
      updatedRequest.requestVariables[reqVarIndex].value = value
    } else {
      updatedRequest.requestVariables.push({ key, value, active: true })
    }
  }

  // Returns setter methods under the `request` namespace
  return {
    methods: {
      setUrl,
      setMethod,
      setHeader,
      setHeaders,
      removeHeader,
      setParam,
      setParams,
      removeParam,
      setBody,
      setAuth,
      setRequestVariable,
    },
    updatedRequest,
  }
}
