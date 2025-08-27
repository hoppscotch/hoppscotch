import { PersistenceService } from "~/services/persistence"
import {
  OauthAuthService,
  PersistedOAuthConfig,
  createFlowConfig,
  generateRandomString,
} from "../oauth.service"
import { z } from "zod"
import { getService } from "~/modules/dioc"
import * as E from "fp-ts/Either"
import { OAuth2ParamSchema } from "../utils"

const persistenceService = getService(PersistenceService)

const ImplicitOauthFlowParamsSchema = z
  .object({
    authEndpoint: z.string(),
    clientID: z.string(),
    scopes: z.string().optional(),
    authRequestParams: z.array(
      OAuth2ParamSchema.omit({
        sendIn: true,
      })
    ),
    refreshRequestParams: z.array(OAuth2ParamSchema),
  })
  .refine((params) => {
    return (
      params.authEndpoint.length >= 1 &&
      params.clientID.length >= 1 &&
      (params.scopes === undefined || params.scopes.length >= 1)
    )
  })

export type ImplicitOauthFlowParams = z.infer<
  typeof ImplicitOauthFlowParamsSchema
>

export const getDefaultImplicitOauthFlowParams =
  (): ImplicitOauthFlowParams => ({
    authEndpoint: "",
    clientID: "",
    scopes: undefined,
    authRequestParams: [],
    refreshRequestParams: [],
  })

const initImplicitOauthFlow = async ({
  clientID,
  scopes,
  authEndpoint,
  authRequestParams,
}: ImplicitOauthFlowParams) => {
  const state = generateRandomString()

  const localOAuthTempConfig =
    await persistenceService.getLocalConfig("oauth_temp_config")

  const persistedOAuthConfig: PersistedOAuthConfig = localOAuthTempConfig
    ? { ...JSON.parse(localOAuthTempConfig) }
    : {}

  // Persist the necessary information for retrieval while getting redirected back
  await persistenceService.setLocalConfig(
    "oauth_temp_config",
    JSON.stringify(<PersistedOAuthConfig>{
      ...persistedOAuthConfig,
      fields: {
        clientID,
        authEndpoint,
        scopes,
        state,
        authRequestParams,
      },
      grant_type: "IMPLICIT",
    })
  )

  let url: URL

  try {
    url = new URL(authEndpoint)
  } catch {
    return E.left("INVALID_AUTH_ENDPOINT")
  }

  url.searchParams.set("client_id", clientID)
  url.searchParams.set("state", state)
  url.searchParams.set("response_type", "token")
  url.searchParams.set("redirect_uri", OauthAuthService.redirectURI)

  if (scopes) url.searchParams.set("scope", scopes)

  // Process additional auth request parameters
  if (authRequestParams) {
    authRequestParams
      .filter((param) => param.active && param.key && param.value)
      .forEach((param) => {
        url.searchParams.set(param.key, param.value)
      })
  }

  // Redirect to the authorization server
  window.location.assign(url.toString())

  return E.right(undefined)
}

const handleRedirectForAuthCodeOauthFlow = async (localConfig: string) => {
  // parse the query string
  const params = new URLSearchParams(window.location.search)
  const paramsFromHash = new URLSearchParams(window.location.hash.substring(1))

  const accessToken =
    params.get("access_token") || paramsFromHash.get("access_token")
  const state = params.get("state") || paramsFromHash.get("state")
  const error = params.get("error") || paramsFromHash.get("error")

  if (error) {
    return E.left("AUTH_SERVER_RETURNED_ERROR")
  }

  if (!accessToken) {
    return E.left("AUTH_TOKEN_REQUEST_FAILED")
  }

  const expectedSchema = z.object({
    source: z.optional(z.string()),
    state: z.string(),
    clientID: z.string(),
  })

  const decodedLocalConfig = expectedSchema.safeParse(
    JSON.parse(localConfig).fields
  )

  if (!decodedLocalConfig.success) {
    return E.left("INVALID_LOCAL_CONFIG")
  }

  // check if the state matches
  if (decodedLocalConfig.data.state !== state) {
    return E.left("INVALID_STATE")
  }

  return E.right({
    access_token: accessToken,
  })
}

export default createFlowConfig(
  "IMPLICIT" as const,
  ImplicitOauthFlowParamsSchema,
  initImplicitOauthFlow,
  handleRedirectForAuthCodeOauthFlow
)
