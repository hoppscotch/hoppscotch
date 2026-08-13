import * as E from "fp-ts/Either"
import { z } from "zod"
import { getService } from "~/modules/dioc"
import { KernelInterceptorService } from "~/services/kernel-interceptor.service"
import { decodeResponseAsJSON } from "./oauth.service"
import { OAuth2AdvancedParam } from "@hoppscotch/data"
import {
  getPayloadForRefreshTokenRequest,
  type ClientAuthentication,
} from "./clientAuthentication"

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
  clientAuthentication?: ClientAuthentication
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
  clientAuthentication,
  refreshRequestParams,
}: RefreshTokenParams) => {
  const { response } = interceptorService.execute(
    getPayloadForRefreshTokenRequest({
      tokenEndpoint,
      clientID,
      clientSecret,
      refreshToken,
      clientAuthentication,
      refreshRequestParams,
    })
  )

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
 * Common OAuth2 parameter schema
 * Used for all OAuth parameter types - omit sendIn field where not needed
 */
export const OAuth2ParamSchema = OAuth2AdvancedParam.extend({
  sendIn: z.enum(["headers", "url", "body"]).optional(),
})
