import {
  HoppRESTAuth,
  HoppRESTHeaders,
  HoppRESTParams,
  HoppRESTReqBody,
  HoppRESTRequest,
} from "@hoppscotch/data"
import { cloneDeep } from "lodash"

export const getRequestMethods = (request: HoppRESTRequest) => {
  // Clone to allow safe mutations internally
  const updatedRequest = <HoppRESTRequest>cloneDeep(request)

  // Mutation methods
  const setUrl = (url: string) => {
    updatedRequest.endpoint = url
  }

  const setMethod = (method: string) => {
    updatedRequest.method = method.toUpperCase()
  }
  const setHeader = (name: string, value: string) => {
    const headers = [...updatedRequest.headers]
    const headerIndex = headers.findIndex(
      (h) => h.key.toLowerCase() === name.toLowerCase(),
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

    updatedRequest.headers = { ...parseResult.data }
  }

  const removeHeader = (key: string) => {
    updatedRequest.headers = updatedRequest.headers.filter((h) => h.key !== key)
  }

  const setParam = (name: string, value: string) => {
    const params = [...updatedRequest.params]
    const paramIndex = params.findIndex(
      (p) => p.key.toLowerCase() === name.toLowerCase(),
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

    updatedRequest.params = { ...parseResult.data }
  }

  const removeParam = (key: string) => {
    updatedRequest.params = updatedRequest.params.filter((h) => h.key !== key)
  }

  const setBody = (body: HoppRESTReqBody) => {
    const parseResult = HoppRESTReqBody.safeParse(body)

    if (!parseResult.success) {
      throw new Error("Invalid body object")
    }

    updatedRequest.body = { ...parseResult.data }
  }

  const setAuth = (auth: HoppRESTAuth) => {
    const parseResult = HoppRESTAuth.safeParse(auth)

    if (!parseResult.success) {
      throw new Error("Invalid auth object")
    }

    updatedRequest.auth = { ...parseResult.data }
  }

  // Return methods and getters grouped in `request` namespace shape
  return {
    methods: {
      // immutable props as getters
      get url() {
        return updatedRequest.endpoint
      },
      get method() {
        return updatedRequest.method
      },
      get params() {
        return updatedRequest.params
      },
      get headers() {
        return updatedRequest.headers
      },
      get body() {
        return updatedRequest.body
      },
      get auth() {
        return updatedRequest.auth
      },

      // Mutations
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
    },
    updatedRequest,
  }
}
