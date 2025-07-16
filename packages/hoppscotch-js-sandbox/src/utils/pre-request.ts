import {
  HoppRESTAuth,
  HoppRESTHeaders,
  HoppRESTParams,
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
    const existingHeaders = { ...updatedRequest.headers }
    existingHeaders.push({ key: name, value, active: true, description: "" })
    updatedRequest.headers = existingHeaders
  }

  const setHeaders = (headers: HoppRESTHeaders) => {
    updatedRequest.headers = headers
  }

  const removeHeader = (key: string) => {
    updatedRequest.headers = updatedRequest.headers.filter((h) => h.key !== key)
  }

  const setParam = (name: string, value: string) => {
    const existingParams = updatedRequest.params
    existingParams.push({ key: name, value, active: true, description: "" })
    updatedRequest.params = existingParams
  }

  const setParams = (params: HoppRESTParams) => {
    updatedRequest.params = { ...params }
  }

  const removeParam = (key: string) => {
    updatedRequest.params = updatedRequest.params.filter((h) => h.key !== key)
  }

  const setBody = (body: any) => {
    updatedRequest.body = body
  }

  const setAuth = (auth: HoppRESTAuth) => {
    updatedRequest.auth = { ...auth }
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
