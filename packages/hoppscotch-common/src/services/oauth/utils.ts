import * as E from "fp-ts/Either"
import { z } from "zod"
import { getService } from "~/modules/dioc"
import { KernelInterceptorService } from "~/services/kernel-interceptor.service"
import { content } from "@hoppscotch/kernel"
import { decodeResponseAsJSON } from "./oauth.service"

const interceptorService = getService(KernelInterceptorService)

// Type definition for refresh request parameters
export type RefreshRequestParam = {
  id: number
  key: string
  value: string
  active: boolean
  sendIn?: "headers" | "url" | "body"
}

// Unified refresh token parameters for all OAuth flows
export type RefreshTokenParams = {
  tokenEndpoint: string
  clientID: string
  refreshToken: string
  clientSecret?: string
  refreshRequestParams?: Array<RefreshRequestParam>
}

/**
 * Unified refresh token function for all OAuth flows
 * Supports both basic flows (authCode) and advanced flows (password, clientCredentials)
 * with optional advanced parameters
 */
export const refreshToken = async ({
  tokenEndpoint,
  clientID,
  refreshToken,
  clientSecret,
  refreshRequestParams,
}: RefreshTokenParams) => {
  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
    Accept: "application/json",
  }

  const bodyParams: Record<string, string> = {
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientID,
    ...(clientSecret && {
      client_secret: clientSecret,
    }),
  }

  const urlParams: Record<string, string> = {}

  // Process additional refresh request parameters (if provided)
  if (refreshRequestParams) {
    refreshRequestParams
      .filter((param) => param.active && param.key && param.value)
      .forEach((param) => {
        if (param.sendIn === "headers") {
          headers[param.key] = param.value
        } else if (param.sendIn === "url") {
          urlParams[param.key] = param.value
        } else {
          // Default to body
          bodyParams[param.key] = param.value
        }
      })
  }

  const url = new URL(tokenEndpoint)
  Object.entries(urlParams).forEach(([key, value]) => {
    url.searchParams.set(key, value)
  })

  const { response } = interceptorService.execute({
    id: Date.now(),
    url: url.toString(),
    method: "POST",
    version: "HTTP/1.1",
    headers,
    content: content.urlencoded(bodyParams),
  })

  const res = await response

  if (E.isLeft(res)) {
    return E.left("AUTH_TOKEN_REQUEST_FAILED" as const)
  }

  const responsePayload = decodeResponseAsJSON(res.right)

  if (E.isLeft(responsePayload)) {
    return E.left("AUTH_TOKEN_REQUEST_FAILED" as const)
  }

  const withAccessTokenAndRefreshTokenSchema = z.object({
    access_token: z.string(),
    refresh_token: z.string().optional(),
  })

  const parsedTokenResponse = withAccessTokenAndRefreshTokenSchema.safeParse(
    responsePayload.right
  )

  return parsedTokenResponse.success
    ? E.right(parsedTokenResponse.data)
    : E.left("AUTH_TOKEN_REQUEST_INVALID_RESPONSE" as const)
}

/**
 * Common OAuth2 parameter schema with all possible fields
 * Used as base for both auth requests and advanced token/refresh requests
 */
export const OAuth2ParamSchema = z.object({
  id: z.number(),
  key: z.string(),
  value: z.string(),
  active: z.boolean(),
  sendIn: z.enum(["headers", "url", "body"]).optional(),
})
