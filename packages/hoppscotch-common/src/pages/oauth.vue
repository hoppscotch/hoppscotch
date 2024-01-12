<template>
  <div class="flex items-center justify-center">
    <HoppSmartSpinner />
  </div>
</template>

<script setup lang="ts">
import { handleOAuthRedirect } from "~/helpers/oauth"
import { useToast } from "~/composables/toast"
import { useI18n } from "~/composables/i18n"

import * as E from "fp-ts/Either"
import { useService } from "dioc/vue"
import { RESTTabService } from "~/services/tab/rest"
import { onMounted } from "vue"

import { useRouter } from "vue-router"

const t = useI18n()
const router = useRouter()

const toast = useToast()

const tabs = useService(RESTTabService)

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

onMounted(async () => {
  const tokenInfo = await handleOAuthRedirect()

  if (E.isLeft(tokenInfo)) {
    toast.error(translateOAuthRedirectError(tokenInfo.left))
    router.push("/")
    return
  }

  if (
    tabs.currentActiveTab.value.document.request.auth.authType === "oauth-2"
  ) {
    tabs.currentActiveTab.value.document.request.auth.token =
      tokenInfo.right.access_token

    router.push("/")
    return
  }
})
</script>
