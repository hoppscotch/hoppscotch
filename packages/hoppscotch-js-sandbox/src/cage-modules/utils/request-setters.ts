import {
  HoppRESTAuth,
  HoppRESTHeaders,
  HoppRESTParams,
  HoppRESTReqBody,
  HoppRESTRequest,
} from "@hoppscotch/data"
import { CageModuleCtx, defineSandboxFn } from "faraday-cage/modules"

import { getRequestSetterMethods } from "~/utils/pre-request"
import { RequestSetterMethodsResult } from "~/types"

/**
 * Creates request setter methods for pre-request scripts
 * These methods allow modification of request properties before execution
 */
export const createRequestSetterMethods = (
  ctx: CageModuleCtx,
  request: HoppRESTRequest
): RequestSetterMethodsResult => {
  const { methods: requestMethods, updatedRequest } =
    getRequestSetterMethods(request)

  const setterMethods = {
    // Request setter methods
    setRequestUrl: defineSandboxFn(ctx, "setRequestUrl", (url: any) => {
      requestMethods.setUrl(url as string)
    }),
    setRequestMethod: defineSandboxFn(
      ctx,
      "setRequestMethod",
      (method: any) => {
        requestMethods.setMethod(method as string)
      }
    ),
    setRequestHeader: defineSandboxFn(
      ctx,
      "setRequestHeader",
      (name: any, value: any) => {
        requestMethods.setHeader(name as string, value as string)
      }
    ),
    setRequestHeaders: defineSandboxFn(
      ctx,
      "setRequestHeaders",
      (headers: any) => {
        requestMethods.setHeaders(headers as HoppRESTHeaders)
      }
    ),
    removeRequestHeader: defineSandboxFn(
      ctx,
      "removeRequestHeader",
      (key: any) => {
        requestMethods.removeHeader(key as string)
      }
    ),
    setRequestParam: defineSandboxFn(
      ctx,
      "setRequestParam",
      (name: any, value: any) => {
        requestMethods.setParam(name as string, value as string)
      }
    ),
    setRequestParams: defineSandboxFn(
      ctx,
      "setRequestParams",
      (params: any) => {
        requestMethods.setParams(params as HoppRESTParams)
      }
    ),
    removeRequestParam: defineSandboxFn(
      ctx,
      "removeRequestParam",
      (key: any) => {
        requestMethods.removeParam(key as string)
      }
    ),
    setRequestBody: defineSandboxFn(ctx, "setRequestBody", (body: any) => {
      requestMethods.setBody(body as HoppRESTReqBody)
    }),
    setRequestAuth: defineSandboxFn(ctx, "setRequestAuth", (auth: any) => {
      requestMethods.setAuth(auth as HoppRESTAuth)
    }),
    setRequestVariable: defineSandboxFn(
      ctx,
      "setRequestVariable",
      (key: any, value: any) => {
        requestMethods.setRequestVariable(key as string, value as string)
      }
    ),
  }

  return {
    methods: setterMethods,
    getUpdatedRequest: () => updatedRequest,
  }
}
