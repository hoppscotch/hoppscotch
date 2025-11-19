<template>
  <div
    v-if="auth && auth.authActive && auth.authType !== 'none'"
    class="max-w-2xl space-y-2"
  >
    <h2
      class="text-sm font-semibold text-secondaryDark flex items-end px-4 p-2 border-b border-divider"
    >
      <span>{{ t("documentation.auth.title") }}</span>
      <span
        v-if="auth.authType === 'inherit'"
        class="ml-2 text-xs text-secondaryLight font-normal"
      >
        (Inherited)
      </span>
    </h2>
    <div class="px-4 py-2 flex flex-col">
      <div class="space-y-3">
        <!-- Basic Auth -->
        <div v-if="auth.authType === 'basic'" class="space-y-2">
          <div class="flex items-center">
            <span class="font-medium text-secondaryDark w-32">{{
              t("documentation.auth.username")
            }}</span>
            <span class="px-1">{{
              auth.username || t("documentation.not_set")
            }}</span>
          </div>
          <div class="flex items-center">
            <span class="font-medium text-secondaryDark w-32">{{
              t("documentation.auth.password")
            }}</span>
            <span class="px-1">••••••••</span>
          </div>
        </div>

        <!-- Bearer Token -->
        <div v-if="auth.authType === 'bearer'" class="space-y-2">
          <div class="flex items-center">
            <span class="font-medium text-secondaryDark w-32">{{
              t("documentation.auth.bearer_token")
            }}</span>
            <span class="px-1">••••••••</span>
          </div>
        </div>

        <!-- API Key -->
        <div v-if="auth.authType === 'api-key'" class="space-y-2">
          <div class="flex items-center">
            <span class="font-medium text-secondaryDark w-32">{{
              t("documentation.key")
            }}</span>
            <span class="px-1">{{
              auth.key || t("documentation.not_set")
            }}</span>
          </div>
          <div class="flex items-center">
            <span class="font-medium text-secondaryDark w-32">{{
              t("documentation.value")
            }}</span>
            <span class="px-1">{{
              auth.value ? "••••••••" : t("documentation.not_set")
            }}</span>
          </div>
          <div class="flex items-center">
            <span class="font-medium text-secondaryDark w-32">{{
              t("documentation.auth.add_to")
            }}</span>
            <span
              class="px-2 py-0.5 text-xs rounded bg-divider text-secondaryDark"
            >
              {{ auth.addTo || "headers" }}
            </span>
          </div>
        </div>

        <!-- OAuth 2.0 -->
        <div v-if="auth.authType === 'oauth-2'" class="space-y-2">
          <div class="flex items-center">
            <span class="font-medium text-secondaryDark w-32">{{
              t("documentation.auth.grant_type")
            }}</span>
            <span class="px-1">{{
              getGrantType() || t("documentation.not_set")
            }}</span>
          </div>
          <div class="flex items-center">
            <span class="font-medium text-secondaryDark w-32">{{
              t("documentation.auth.auth_url")
            }}</span>
            <span class="px-1 text-xs break-all">{{
              getAuthEndpoint() || t("documentation.not_set")
            }}</span>
          </div>
          <div class="flex items-center">
            <span class="font-medium text-secondaryDark w-32">{{
              t("documentation.auth.token_url")
            }}</span>
            <span class="px-1 text-xs break-all">{{
              getTokenEndpoint() || t("documentation.not_set")
            }}</span>
          </div>
          <div class="flex items-center">
            <span class="font-medium text-secondaryDark w-32">{{
              t("documentation.auth.client_id")
            }}</span>
            <span class="px-1">{{
              getClientId() || t("documentation.not_set")
            }}</span>
          </div>
          <div class="flex items-center">
            <span class="font-medium text-secondaryDark w-32">{{
              t("documentation.auth.client_secret")
            }}</span>
            <span class="px-1">{{
              hasClientSecret() ? "••••••••" : t("documentation.not_set")
            }}</span>
          </div>
          <div class="flex items-center">
            <span class="font-medium text-secondaryDark w-32">{{
              t("documentation.auth.scope")
            }}</span>
            <span class="px-1">{{
              getScopes() || t("documentation.not_set")
            }}</span>
          </div>
        </div>
      </div>

      <!-- Digest Auth -->
      <div v-if="auth.authType === 'digest'" class="space-y-2">
        <div class="flex items-center">
          <span class="font-medium text-secondaryDark w-32">{{
            t("documentation.auth.username")
          }}</span>
          <span class="px-1">{{
            auth.username || t("documentation.not_set")
          }}</span>
        </div>
        <div class="flex items-center">
          <span class="font-medium text-secondaryDark w-32">{{
            t("documentation.auth.password")
          }}</span>
          <span class="px-1">••••••••</span>
        </div>
        <div class="flex items-center">
          <span class="font-medium text-secondaryDark w-32">{{
            t("documentation.auth.realm")
          }}</span>
          <span class="px-1">{{
            auth.realm || t("documentation.not_set")
          }}</span>
        </div>
        <div class="flex items-center">
          <span class="font-medium text-secondaryDark w-32">{{
            t("documentation.auth.nonce")
          }}</span>
          <span class="px-1">{{
            auth.nonce || t("documentation.not_set")
          }}</span>
        </div>
        <div class="flex items-center">
          <span class="font-medium text-secondaryDark w-32">{{
            t("documentation.auth.algorithm")
          }}</span>
          <span class="px-1">{{ auth.algorithm || "MD5" }}</span>
        </div>
        <div class="flex items-center">
          <span class="font-medium text-secondaryDark w-32">{{
            t("documentation.auth.qop")
          }}</span>
          <span class="px-1">{{ auth.qop || "auth" }}</span>
        </div>
        <div class="flex items-center">
          <span class="font-medium text-secondaryDark w-32">{{
            t("documentation.auth.client_nonce")
          }}</span>
          <span class="px-1">{{
            auth.cnonce || t("documentation.not_set")
          }}</span>
        </div>
        <div class="flex items-center">
          <span class="font-medium text-secondaryDark w-32">{{
            t("documentation.auth.opaque")
          }}</span>
          <span class="px-1">{{
            auth.opaque || t("documentation.not_set")
          }}</span>
        </div>
      </div>

      <!-- AWS Signature -->
      <div v-if="auth.authType === 'aws-signature'" class="space-y-2">
        <div class="flex items-center">
          <span class="font-medium text-secondaryDark w-32">{{
            t("documentation.auth.access_key")
          }}</span>
          <span class="px-1">{{
            auth.accessKey || t("documentation.not_set")
          }}</span>
        </div>
        <div class="flex items-center">
          <span class="font-medium text-secondaryDark w-32">{{
            t("documentation.auth.secret_key")
          }}</span>
          <span class="px-1">••••••••</span>
        </div>
        <div class="flex items-center">
          <span class="font-medium text-secondaryDark w-32">{{
            t("documentation.auth.region")
          }}</span>
          <span class="px-1">{{
            auth.region || t("documentation.not_set")
          }}</span>
        </div>
        <div class="flex items-center">
          <span class="font-medium text-secondaryDark w-32">{{
            t("documentation.auth.service_name")
          }}</span>
          <span class="px-1">{{
            auth.serviceName || t("documentation.not_set")
          }}</span>
        </div>
        <div class="flex items-center">
          <span class="font-medium text-secondaryDark w-32">{{
            t("documentation.auth.add_to")
          }}</span>
          <span
            class="px-2 py-0.5 text-xs rounded bg-divider text-secondaryDark"
          >
            {{ auth.addTo || "HEADERS" }}
          </span>
        </div>
      </div>

      <!-- HAWK Auth -->
      <div v-if="auth.authType === 'hawk'" class="space-y-2">
        <div class="flex items-center">
          <span class="font-medium text-secondaryDark w-32">{{
            t("documentation.auth.auth_id")
          }}</span>
          <span class="px-1">{{
            auth.authId || t("documentation.not_set")
          }}</span>
        </div>
        <div class="flex items-center">
          <span class="font-medium text-secondaryDark w-32">{{
            t("documentation.auth.auth_key")
          }}</span>
          <span class="px-1">••••••••</span>
        </div>
        <div class="flex items-center">
          <span class="font-medium text-secondaryDark w-32">{{
            t("documentation.auth.algorithm")
          }}</span>
          <span class="px-1">{{ auth.algorithm || "sha256" }}</span>
        </div>
        <div class="flex items-center">
          <span class="font-medium text-secondaryDark w-32">{{
            t("documentation.auth.user")
          }}</span>
          <span class="px-1">{{
            auth.user || t("documentation.not_set")
          }}</span>
        </div>
        <div class="flex items-center">
          <span class="font-medium text-secondaryDark w-32">{{
            t("documentation.auth.nonce")
          }}</span>
          <span class="px-1">{{
            auth.nonce || t("documentation.not_set")
          }}</span>
        </div>
        <div class="flex items-center">
          <span class="font-medium text-secondaryDark w-32">{{
            t("documentation.auth.extra_data")
          }}</span>
          <span class="px-1">{{ auth.ext || t("documentation.not_set") }}</span>
        </div>
        <div class="flex items-center">
          <span class="font-medium text-secondaryDark w-32">{{
            t("documentation.auth.app_id")
          }}</span>
          <span class="px-1">{{ auth.app || t("documentation.not_set") }}</span>
        </div>
        <div class="flex items-center">
          <span class="font-medium text-secondaryDark w-32">{{
            t("documentation.auth.delegation")
          }}</span>
          <span class="px-1">{{ auth.dlg || t("documentation.not_set") }}</span>
        </div>
        <div class="flex items-center">
          <span class="font-medium text-secondaryDark w-32">{{
            t("documentation.auth.timestamp")
          }}</span>
          <span class="px-1">{{
            auth.timestamp || t("documentation.not_set")
          }}</span>
        </div>
        <div class="flex items-center">
          <span class="font-medium text-secondaryDark w-32">{{
            t("documentation.auth.include_payload_hash")
          }}</span>
          <span class="px-1">{{
            auth.includePayloadHash
              ? t("documentation.yes")
              : t("documentation.no")
          }}</span>
        </div>
      </div>

      <!-- Akamai EdgeGrid -->
      <div v-if="auth.authType === 'akamai-eg'" class="space-y-2">
        <div class="flex items-center">
          <span class="font-medium text-secondaryDark w-32">{{
            t("documentation.auth.access_token")
          }}</span>
          <span class="px-1">••••••••</span>
        </div>
        <div class="flex items-center">
          <span class="font-medium text-secondaryDark w-32">{{
            t("documentation.auth.client_token")
          }}</span>
          <span class="px-1">••••••••</span>
        </div>
        <div class="flex items-center">
          <span class="font-medium text-secondaryDark w-32">{{
            t("documentation.auth.client_secret")
          }}</span>
          <span class="px-1">••••••••</span>
        </div>
        <div class="flex items-center">
          <span class="font-medium text-secondaryDark w-32">{{
            t("documentation.auth.nonce")
          }}</span>
          <span class="px-1">{{
            auth.nonce || t("documentation.not_set")
          }}</span>
        </div>
        <div class="flex items-center">
          <span class="font-medium text-secondaryDark w-32">{{
            t("documentation.auth.timestamp")
          }}</span>
          <span class="px-1">{{
            auth.timestamp || t("documentation.not_set")
          }}</span>
        </div>
        <div class="flex items-center">
          <span class="font-medium text-secondaryDark w-32">{{
            t("documentation.auth.host")
          }}</span>
          <span class="px-1">{{
            auth.host || t("documentation.not_set")
          }}</span>
        </div>
        <div class="flex items-center">
          <span class="font-medium text-secondaryDark w-32">{{
            t("documentation.auth.headers_to_sign")
          }}</span>
          <span class="px-1">{{
            auth.headersToSign || t("documentation.not_set")
          }}</span>
        </div>
        <div class="flex items-center">
          <span class="font-medium text-secondaryDark w-32">{{
            t("documentation.auth.max_body_size")
          }}</span>
          <span class="px-1">{{
            auth.maxBodySize || t("documentation.not_set")
          }}</span>
        </div>
      </div>

      <!-- JWT Auth -->
      <div v-if="auth.authType === 'jwt'" class="space-y-2">
        <div class="flex items-center">
          <span class="font-medium text-secondaryDark w-32">{{
            t("documentation.auth.algorithm")
          }}</span>
          <span class="px-1">{{ auth.algorithm || "HS256" }}</span>
        </div>
        <div class="flex items-center">
          <span class="font-medium text-secondaryDark w-32">{{
            t("documentation.auth.payload")
          }}</span>
          <span class="px-1 break-all">{{
            auth.payload || t("documentation.not_set")
          }}</span>
        </div>
        <div class="flex items-center">
          <span class="font-medium text-secondaryDark w-32">{{
            t("documentation.auth.add_to")
          }}</span>
          <span
            class="px-2 py-0.5 text-xs rounded bg-divider text-secondaryDark"
          >
            {{ auth.addTo || "HEADERS" }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { HoppRESTAuth, HoppGQLAuth } from "@hoppscotch/data"
import { useI18n } from "~/composables/i18n"

const t = useI18n()

const props = defineProps<{
  auth: HoppRESTAuth | HoppGQLAuth | null | undefined
}>()

// Helper functions for OAuth 2.0
const getGrantType = () => {
  if (
    props.auth?.authType === "oauth-2" &&
    "grantTypeInfo" in props.auth &&
    props.auth.grantTypeInfo
  ) {
    return props.auth.grantTypeInfo.grantType
  }
  return undefined
}

const getAuthEndpoint = () => {
  if (
    props.auth?.authType === "oauth-2" &&
    "grantTypeInfo" in props.auth &&
    props.auth.grantTypeInfo
  ) {
    return props.auth.grantTypeInfo.authEndpoint
  }
  return undefined
}

const getTokenEndpoint = () => {
  if (
    props.auth?.authType === "oauth-2" &&
    "grantTypeInfo" in props.auth &&
    props.auth.grantTypeInfo &&
    "tokenEndpoint" in props.auth.grantTypeInfo
  ) {
    return props.auth.grantTypeInfo.tokenEndpoint
  }
  return undefined
}

const getClientId = () => {
  if (
    props.auth?.authType === "oauth-2" &&
    "grantTypeInfo" in props.auth &&
    props.auth.grantTypeInfo
  ) {
    return props.auth.grantTypeInfo.clientID
  }
  return undefined
}

const hasClientSecret = () => {
  if (
    props.auth?.authType === "oauth-2" &&
    "grantTypeInfo" in props.auth &&
    props.auth.grantTypeInfo &&
    "clientSecret" in props.auth.grantTypeInfo
  ) {
    return !!props.auth.grantTypeInfo.clientSecret
  }
  return false
}

const getScopes = () => {
  if (
    props.auth?.authType === "oauth-2" &&
    "grantTypeInfo" in props.auth &&
    props.auth.grantTypeInfo
  ) {
    return props.auth.grantTypeInfo.scopes
  }
  return undefined
}
</script>
