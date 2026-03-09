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
    setRequestUrl: defineSandboxFn(ctx, "setRequestUrl", (url: unknown) => {
      requestMethods.setUrl(url as string)
    }),
    setRequestMethod: defineSandboxFn(
      ctx,
      "setRequestMethod",
      (method: unknown) => {
        requestMethods.setMethod(method as string)
      }
    ),
    setRequestHeader: defineSandboxFn(
      ctx,
      "setRequestHeader",
      (name: unknown, value: unknown) => {
        requestMethods.setHeader(name as string, value as string)
      }
    ),
    setRequestHeaders: defineSandboxFn(
      ctx,
      "setRequestHeaders",
      (headers: unknown) => {
        requestMethods.setHeaders(headers as HoppRESTHeaders)
      }
    ),
    removeRequestHeader: defineSandboxFn(
      ctx,
      "removeRequestHeader",
      (key: unknown) => {
        requestMethods.removeHeader(key as string)
      }
    ),
    setRequestParam: defineSandboxFn(
      ctx,
      "setRequestParam",
      (name: unknown, value: unknown) => {
        requestMethods.setParam(name as string, value as string)
      }
    ),
    setRequestParams: defineSandboxFn(
      ctx,
      "setRequestParams",
      (params: unknown) => {
        requestMethods.setParams(params as HoppRESTParams)
      }
    ),
    removeRequestParam: defineSandboxFn(
      ctx,
      "removeRequestParam",
      (key: unknown) => {
        requestMethods.removeParam(key as string)
      }
    ),
    setRequestBody: defineSandboxFn(ctx, "setRequestBody", (body: unknown) => {
      requestMethods.setBody(body as HoppRESTReqBody)
    }),
    setRequestAuth: defineSandboxFn(ctx, "setRequestAuth", (auth: unknown) => {
      requestMethods.setAuth(auth as HoppRESTAuth)
    }),
    setRequestVariable: defineSandboxFn(
      ctx,
      "setRequestVariable",
      (key: unknown, value: unknown) => {
        requestMethods.setRequestVariable(key as string, value as string)
      }
    ),
  }

  return {
    methods: setterMethods,
    getUpdatedRequest: () => updatedRequest,
  }
}
