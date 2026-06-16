import { PersistenceService } from "~/services/persistence"
import {
  PersistedOAuthConfig,
  createFlowConfig,
  generateRandomString,
  getOAuthRedirectURI,
  startOAuthFlow,
} from "../oauth.service"
import { z } from "zod"
import { getService } from "~/modules/dioc"
import * as E from "fp-ts/Either"
import {
  ImplicitOauthFlowParams as ImplicitOauthFlowParamsData,
  OAuth2AuthRequestParam,
} from "@hoppscotch/data"
import { OAuth2ParamSchema } from "../utils"

const persistenceService = getService(PersistenceService)

// Use the existing schema from hoppscotch-data
const ImplicitOauthFlowParamsSchema = ImplicitOauthFlowParamsData.omit({
  grantType: true,
  token: true,
})
  .extend({
    // Override optional arrays to be required for the service layer
    authRequestParams: z.array(OAuth2AuthRequestParam),
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
    redirectURI: getOAuthRedirectURI(),
    authRequestParams: [],
    refreshRequestParams: [],
  })

const initImplicitOauthFlow = async ({
  clientID,
  scopes,
  authEndpoint,
  redirectURI: customRedirectURI,
  authRequestParams,
}: ImplicitOauthFlowParams) => {
  const state = generateRandomString()
  const redirectURI = getOAuthRedirectURI({ redirectURI: customRedirectURI })

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
        redirectURI,
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
  url.searchParams.set("redirect_uri", redirectURI)

  if (scopes) url.searchParams.set("scope", scopes)

  // Process additional auth request parameters
  if (authRequestParams) {
    authRequestParams
      .filter((param) => param.active && param.key && param.value)
      .forEach((param) => {
        url.searchParams.set(param.key, param.value)
      })
  }

  const callbackURL = await startOAuthFlow(url.toString(), redirectURI)

  if (callbackURL) {
    const updatedLocalOAuthTempConfig =
      await persistenceService.getLocalConfig("oauth_temp_config")

    if (!updatedLocalOAuthTempConfig) {
      return E.left("INVALID_LOCAL_CONFIG")
    }

    const result = await handleRedirectForAuthCodeOauthFlow(
      updatedLocalOAuthTempConfig,
      callbackURL
    )

    if (E.isRight(result)) {
      await persistenceService.removeLocalConfig("oauth_temp_config")
    }

    return result
  }

  return E.right(undefined)
}

const handleRedirectForAuthCodeOauthFlow = async (
  localConfig: string,
  callbackURL?: string
) => {
  // parse the query string
  const callback = callbackURL ? new URL(callbackURL) : window.location
  const params = new URLSearchParams(callback.search)
  const paramsFromHash = new URLSearchParams(callback.hash.substring(1))

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
