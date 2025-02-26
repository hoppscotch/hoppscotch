import * as E from "fp-ts/Either"
import * as O from "fp-ts/Option"
import {
  OauthAuthService,
  createFlowConfig,
  decodeResponseAsJSON,
} from "../oauth.service"
import { z } from "zod"
import { getService } from "~/modules/dioc"
import { KernelInterceptorService } from "~/services/kernel-interceptor.service"
import { useToast } from "~/composables/toast"
import { PasswordGrantTypeParams } from "@hoppscotch/data"
import { content } from "@hoppscotch/kernel"
import { parseBytesTo } from "~/helpers/functional/parse"

const interceptorService = getService(KernelInterceptorService)

const PasswordFlowParamsSchema = PasswordGrantTypeParams.pick({
  authEndpoint: true,
  clientID: true,
  clientSecret: true,
  scopes: true,
  username: true,
  password: true,
}).refine(
  (params) => {
    return (
      params.authEndpoint.length >= 1 &&
      params.clientID.length >= 1 &&
      params.username.length >= 1 &&
      params.password.length >= 1 &&
      (!params.scopes || params.scopes.length >= 1)
    )
  },
  {
    message: "Minimum length requirement not met for one or more parameters",
  }
)

export type PasswordFlowParams = z.infer<typeof PasswordFlowParamsSchema>

export const getDefaultPasswordFlowParams = (): PasswordFlowParams => ({
  authEndpoint: "",
  clientID: "",
  clientSecret: "",
  scopes: undefined,
  username: "",
  password: "",
})

const initPasswordOauthFlow = async ({
  password,
  username,
  clientID,
  clientSecret,
  scopes,
  authEndpoint,
}: PasswordFlowParams) => {
  const toast = useToast()

  const { response } = interceptorService.execute({
    id: Date.now(),
    url: authEndpoint,
    method: "POST",
    version: "HTTP/1.1",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    content: content.urlencoded({
      grant_type: "password",
      client_id: clientID,
      username,
      password,
      ...(clientSecret && {
        client_secret: clientSecret,
      }),
      ...(scopes && {
        scopes: scopes,
      }),
    }),
  })

  const res = await response

  if (E.isLeft(res) || res.right.status !== 200) {
    toast.error("AUTH_TOKEN_REQUEST_FAILED")
    return E.left("AUTH_TOKEN_REQUEST_FAILED" as const)
  }

  const withAccessTokenSchema = z.object({
    access_token: z.string(),
  })

  const responsePayload = parseBytesTo<{ access_token: string }>(
    res.right.body.body
  )

  if (O.isSome(responsePayload)) {
    const parsedTokenResponse = withAccessTokenSchema.safeParse(
      responsePayload.value
    )
    return parsedTokenResponse.success
      ? E.right(parsedTokenResponse.data)
      : E.left("AUTH_TOKEN_REQUEST_INVALID_RESPONSE" as const)
  }

  return E.left("AUTH_TOKEN_REQUEST_INVALID_RESPONSE" as const)
}

const handleRedirectForAuthCodeOauthFlow = async (localConfig: string) => {
  // parse the query string
  const params = new URLSearchParams(window.location.search)

  const code = params.get("code")
  const state = params.get("state")
  const error = params.get("error")

  if (error) {
    return E.left("AUTH_SERVER_RETURNED_ERROR")
  }

  if (!code) {
    return E.left("AUTH_TOKEN_REQUEST_FAILED")
  }

  const expectedSchema = z.object({
    state: z.string(),
    tokenEndpoint: z.string(),
    clientSecret: z.string(),
    clientID: z.string(),
  })

  const decodedLocalConfig = expectedSchema.safeParse(JSON.parse(localConfig))

  if (!decodedLocalConfig.success) {
    return E.left("INVALID_LOCAL_CONFIG")
  }

  // check if the state matches
  if (decodedLocalConfig.data.state !== state) {
    return E.left("INVALID_STATE")
  }

  // exchange the code for a token
  const config = {
    code,
    client_id: decodedLocalConfig.data.clientID,
    client_secret: decodedLocalConfig.data.clientSecret,
    redirect_uri: OauthAuthService.redirectURI,
  }

  const { response } = interceptorService.execute({
    id: Date.now(),
    url: decodedLocalConfig.data.tokenEndpoint,
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    content: content.urlencoded(config),
  })

  const res = await response

  if (E.isLeft(res)) {
    return E.left("AUTH_TOKEN_REQUEST_FAILED" as const)
  }

  const responsePayload = decodeResponseAsJSON(res.right)

  if (E.isLeft(responsePayload)) {
    return E.left("AUTH_TOKEN_REQUEST_FAILED" as const)
  }

  const withAccessTokenSchema = z.object({
    access_token: z.string(),
  })

  const parsedTokenResponse = withAccessTokenSchema.safeParse(
    responsePayload.right
  )

  return parsedTokenResponse.success
    ? E.right(parsedTokenResponse.data)
    : E.left("AUTH_TOKEN_REQUEST_INVALID_RESPONSE" as const)
}

export default createFlowConfig(
  "PASSWORD" as const,
  PasswordFlowParamsSchema,
  initPasswordOauthFlow,
  handleRedirectForAuthCodeOauthFlow
)
