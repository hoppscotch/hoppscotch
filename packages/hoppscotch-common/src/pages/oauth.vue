<template>
  <div class="flex items-center justify-center">
    <HoppSmartSpinner />
  </div>
</template>

<script setup lang="ts">
import type { HoppGQLAuth, HoppRESTAuth } from "@hoppscotch/data"
import { useI18n } from "~/composables/i18n"
import { useToast } from "~/composables/toast"

import { useService } from "dioc/vue"
import * as E from "fp-ts/Either"
import { onMounted } from "vue"
import { RESTTabService } from "~/services/tab/rest"

import { useRouter } from "vue-router"

import {
  PersistedOAuthConfig,
  routeOAuthRedirect,
} from "~/services/oauth/oauth.service"
import { getDefaultGQLRequest } from "~/helpers/graphql/default"
import { getDefaultRESTRequest } from "~/helpers/rest/default"
import { PersistenceService } from "~/services/persistence"
import { GQLTabService } from "~/services/tab/graphql"

const t = useI18n()
const router = useRouter()

const toast = useToast()

const gqlTabs = useService(GQLTabService)
const persistenceService = useService(PersistenceService)
const restTabs = useService(RESTTabService)

function translateOAuthRedirectError(error: string) {
  switch (error) {
    case "AUTH_SERVER_RETURNED_ERROR":
      return t("authorization.oauth.redirect_auth_server_returned_error")

    case "NO_AUTH_CODE":
      return t("authorization.oauth.redirect_no_auth_code")

    case "INVALID_STATE":
      return t("authorization.oauth.redirect_invalid_state")

    case "NO_TOKEN_ENDPOINT":
      return t("authorization.oauth.redirect_no_token_endpoint")

    case "NO_CLIENT_ID":
      return t("authorization.oauth.redirect_no_client_id")

    case "NO_CLIENT_SECRET":
      return t("authorization.oauth.redirect_no_client_secret")

    case "NO_CODE_VERIFIER":
      return t("authorization.oauth.redirect_no_code_verifier")

    case "AUTH_TOKEN_REQUEST_FAILED":
      return t("authorization.oauth.redirect_auth_token_request_failed")

    case "AUTH_TOKEN_REQUEST_INVALID_RESPONSE":
      return t(
        "authorization.oauth.redirect_auth_token_request_invalid_response"
      )

    default:
      return t("authorization.oauth.something_went_wrong_on_oauth_redirect")
  }
}

const buildOAuthAuth = (
  config: PersistedOAuthConfig,
  accessToken: string,
  refreshToken?: string
): HoppRESTAuth | null => {
  if (
    !config.fields ||
    (config.grant_type !== "AUTHORIZATION_CODE" &&
      config.grant_type !== "IMPLICIT")
  ) {
    return null
  }

  const {
    state: _state,
    codeVerifier: _codeVerifier,
    codeChallenge: _codeChallenge,
    ...grantTypeFields
  } = config.fields as Record<string, unknown>

  return {
    authType: "oauth-2",
    authActive: true,
    addTo: "HEADERS",
    grantTypeInfo: {
      ...grantTypeFields,
      grantType: config.grant_type,
      token: accessToken,
      ...(config.grant_type === "AUTHORIZATION_CODE" && refreshToken
        ? { refreshToken }
        : {}),
    },
  } as HoppRESTAuth
}

const createRESTTabWithOAuthToken = (
  config: PersistedOAuthConfig,
  accessToken: string,
  refreshToken?: string
) => {
  const auth = buildOAuthAuth(config, accessToken, refreshToken)
  if (!auth) return null

  const tab = restTabs.createNewTab({
    type: "request",
    request: {
      ...getDefaultRESTRequest(),
      auth,
    },
    isDirty: false,
  })

  restTabs.setActiveTab(tab.id)

  return tab
}

const createGQLTabWithOAuthToken = (
  config: PersistedOAuthConfig,
  accessToken: string,
  refreshToken?: string
) => {
  const auth = buildOAuthAuth(config, accessToken, refreshToken)
  if (!auth) return null

  const tab = gqlTabs.createNewTab({
    request: {
      ...getDefaultGQLRequest(),
      auth: auth as HoppGQLAuth,
    },
    isDirty: false,
    cursorPosition: 0,
  })

  gqlTabs.setActiveTab(tab.id)

  return tab
}

onMounted(async () => {
  const localOAuthTempConfig =
    await persistenceService.getLocalConfig("oauth_temp_config")

  if (!localOAuthTempConfig) {
    toast.error(t("authorization.oauth.something_went_wrong_on_oauth_redirect"))
    router.push("/")
    return
  }

  const persistedOAuthConfig: PersistedOAuthConfig =
    JSON.parse(localOAuthTempConfig)

  const { context, source } = persistedOAuthConfig

  const tokenInfo = await routeOAuthRedirect()

  if (E.isLeft(tokenInfo)) {
    toast.error(translateOAuthRedirectError(tokenInfo.left))
    router.push(source === "REST" ? "/" : "/graphql")
    return
  }

  // Indicates the access token generation flow originated from the modal for setting authorization/headers at the collection level
  if (context?.type === "collection-properties") {
    // Set the access token in `localStorage` to retrieve from the modal while redirecting back
    const authConfig: PersistedOAuthConfig = {
      ...persistedOAuthConfig,
      token: tokenInfo.right.access_token,
    }

    if (tokenInfo.right.refresh_token) {
      authConfig.refresh_token = tokenInfo.right.refresh_token
    }

    await persistenceService.setLocalConfig(
      "oauth_temp_config",
      JSON.stringify(authConfig)
    )

    toast.success(t("authorization.oauth.token_fetched_successfully"))

    router.push(source === "REST" ? "/" : "/graphql")
    return
  }

  const routeToRedirect = source === "GraphQL" ? "/graphql" : "/"
  const accessToken = tokenInfo.right.access_token
  const refreshToken = tokenInfo.right.refresh_token

  const activeTab =
    source === "GraphQL"
      ? (gqlTabs.currentActiveTab.value ??
        createGQLTabWithOAuthToken(
          persistedOAuthConfig,
          accessToken,
          refreshToken
        ))
      : (restTabs.currentActiveTab.value ??
        createRESTTabWithOAuthToken(
          persistedOAuthConfig,
          accessToken,
          refreshToken
        ))

  const activeDocument =
    activeTab && "type" in activeTab.document
      ? activeTab.document.type === "request"
        ? activeTab.document
        : null
      : activeTab?.document

  if (activeDocument?.request.auth.authType === "oauth-2") {
    activeDocument.request.auth.grantTypeInfo.token = accessToken

    if (
      activeDocument.request.auth.grantTypeInfo.grantType ===
      "AUTHORIZATION_CODE"
    ) {
      activeDocument.request.auth.grantTypeInfo.refreshToken = refreshToken
    }

    toast.success(t("authorization.oauth.token_fetched_successfully"))
  }

  router.push(routeToRedirect)
})
</script>
