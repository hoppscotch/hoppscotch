<template>
  <div
    v-if="
      effectiveAuth &&
      effectiveAuth.authActive &&
      effectiveAuth.authType !== 'none' &&
      effectiveAuth.authType !== 'inherit'
    "
    class="max-w-2xl space-y-2"
  >
    <h2
      class="text-sm font-semibold text-secondaryDark flex items-center px-4 p-2 border-b border-divider"
    >
      <span>{{ t("documentation.auth.title") }}</span>
      <span
        v-if="auth?.authType === 'inherit'"
        class="ml-2 font-semibold capitalize px-2 py-1 text-tiny rounded bg-divider text-secondaryDark truncate"
      >
        ({{
          t("documentation.inherited_with_type", {
            name: inheritedAuth?.parentName,
            type: inheritedAuth?.inheritedAuth.authType,
          })
        }})
      </span>
    </h2>
    <div class="px-4 py-2 flex flex-col">
      <div class="space-y-3">
        <!-- Basic Auth -->
        <div v-if="effectiveAuth.authType === 'basic'" class="space-y-2">
          <div class="flex items-center">
            <span class="font-medium text-secondaryDark w-32">{{
              t("documentation.auth.username")
            }}</span>
            <span class="px-1">{{
              effectiveAuth.username || t("documentation.not_set")
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
        <div v-if="effectiveAuth.authType === 'bearer'" class="space-y-2">
          <div class="flex items-center">
            <span class="font-medium text-secondaryDark w-32">{{
              t("documentation.auth.bearer_token")
            }}</span>
            <span class="px-1">••••••••</span>
          </div>
        </div>

        <!-- API Key -->
        <div v-if="effectiveAuth.authType === 'api-key'" class="space-y-2">
          <div class="flex items-center">
            <span class="font-medium text-secondaryDark w-32">{{
              t("documentation.key")
            }}</span>
            <span class="px-1">{{
              effectiveAuth.key || t("documentation.not_set")
            }}</span>
          </div>
          <div class="flex items-center">
            <span class="font-medium text-secondaryDark w-32">{{
              t("documentation.value")
            }}</span>
            <span class="px-1">{{
              effectiveAuth.value ? "••••••••" : t("documentation.not_set")
            }}</span>
          </div>
          <div class="flex items-center">
            <span class="font-medium text-secondaryDark w-32">{{
              t("documentation.auth.add_to")
            }}</span>
            <span
              class="px-2 py-0.5 text-xs rounded bg-divider text-secondaryDark"
            >
              {{ effectiveAuth.addTo || "headers" }}
            </span>
          </div>
        </div>

        <!-- OAuth 2.0 -->
        <div v-if="effectiveAuth.authType === 'oauth-2'" class="space-y-2">
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
      <div v-if="effectiveAuth.authType === 'digest'" class="space-y-2">
        <div class="flex items-center">
          <span class="font-medium text-secondaryDark w-32">{{
            t("documentation.auth.username")
          }}</span>
          <span class="px-1">{{
            effectiveAuth.username || t("documentation.not_set")
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
            effectiveAuth.realm || t("documentation.not_set")
          }}</span>
        </div>
        <div class="flex items-center">
          <span class="font-medium text-secondaryDark w-32">{{
            t("documentation.auth.nonce")
          }}</span>
          <span class="px-1">{{
            effectiveAuth.nonce || t("documentation.not_set")
          }}</span>
        </div>
        <div class="flex items-center">
          <span class="font-medium text-secondaryDark w-32">{{
            t("documentation.auth.algorithm")
          }}</span>
          <span class="px-1">{{ effectiveAuth.algorithm || "MD5" }}</span>
        </div>
        <div class="flex items-center">
          <span class="font-medium text-secondaryDark w-32">{{
            t("documentation.auth.qop")
          }}</span>
          <span class="px-1">{{ effectiveAuth.qop || "auth" }}</span>
        </div>
        <div class="flex items-center">
          <span class="font-medium text-secondaryDark w-32">{{
            t("documentation.auth.client_nonce")
          }}</span>
          <span class="px-1">{{
            effectiveAuth.cnonce || t("documentation.not_set")
          }}</span>
        </div>
        <div class="flex items-center">
          <span class="font-medium text-secondaryDark w-32">{{
            t("documentation.auth.opaque")
          }}</span>
          <span class="px-1">{{
            effectiveAuth.opaque || t("documentation.not_set")
          }}</span>
        </div>
      </div>

      <!-- AWS Signature -->
      <div v-if="effectiveAuth.authType === 'aws-signature'" class="space-y-2">
        <div class="flex items-center">
          <span class="font-medium text-secondaryDark w-32">{{
            t("documentation.auth.access_key")
          }}</span>
          <span class="px-1">{{
            effectiveAuth.accessKey || t("documentation.not_set")
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
            effectiveAuth.region || t("documentation.not_set")
          }}</span>
        </div>
        <div class="flex items-center">
          <span class="font-medium text-secondaryDark w-32">{{
            t("documentation.auth.service_name")
          }}</span>
          <span class="px-1">{{
            effectiveAuth.serviceName || t("documentation.not_set")
          }}</span>
        </div>
        <div class="flex items-center">
          <span class="font-medium text-secondaryDark w-32">{{
            t("documentation.auth.add_to")
          }}</span>
          <span
            class="px-2 py-0.5 text-xs rounded bg-divider text-secondaryDark"
          >
            {{ effectiveAuth.addTo || "HEADERS" }}
          </span>
        </div>
      </div>

      <!-- HAWK Auth -->
      <div v-if="effectiveAuth.authType === 'hawk'" class="space-y-2">
        <div class="flex items-center">
          <span class="font-medium text-secondaryDark w-32">{{
            t("documentation.auth.auth_id")
          }}</span>
          <span class="px-1">{{
            effectiveAuth.authId || t("documentation.not_set")
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
          <span class="px-1">{{ effectiveAuth.algorithm || "sha256" }}</span>
        </div>
        <div class="flex items-center">
          <span class="font-medium text-secondaryDark w-32">{{
            t("documentation.auth.user")
          }}</span>
          <span class="px-1">{{
            effectiveAuth.user || t("documentation.not_set")
          }}</span>
        </div>
        <div class="flex items-center">
          <span class="font-medium text-secondaryDark w-32">{{
            t("documentation.auth.nonce")
          }}</span>
          <span class="px-1">{{
            effectiveAuth.nonce || t("documentation.not_set")
          }}</span>
        </div>
        <div class="flex items-center">
          <span class="font-medium text-secondaryDark w-32">{{
            t("documentation.auth.extra_data")
          }}</span>
          <span class="px-1">{{
            effectiveAuth.ext || t("documentation.not_set")
          }}</span>
        </div>
        <div class="flex items-center">
          <span class="font-medium text-secondaryDark w-32">{{
            t("documentation.auth.app_id")
          }}</span>
          <span class="px-1">{{
            effectiveAuth.app || t("documentation.not_set")
          }}</span>
        </div>
        <div class="flex items-center">
          <span class="font-medium text-secondaryDark w-32">{{
            t("documentation.auth.delegation")
          }}</span>
          <span class="px-1">{{
            effectiveAuth.dlg || t("documentation.not_set")
          }}</span>
        </div>
        <div class="flex items-center">
          <span class="font-medium text-secondaryDark w-32">{{
            t("documentation.auth.timestamp")
          }}</span>
          <span class="px-1">{{
            effectiveAuth.timestamp || t("documentation.not_set")
          }}</span>
        </div>
        <div class="flex items-center">
          <span class="font-medium text-secondaryDark w-32">{{
            t("documentation.auth.include_payload_hash")
          }}</span>
          <span class="px-1">{{
            effectiveAuth.includePayloadHash
              ? t("documentation.yes")
              : t("documentation.no")
          }}</span>
        </div>
      </div>

      <!-- Akamai EdgeGrid -->
      <div v-if="effectiveAuth.authType === 'akamai-eg'" class="space-y-2">
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
            effectiveAuth.nonce || t("documentation.not_set")
          }}</span>
        </div>
        <div class="flex items-center">
          <span class="font-medium text-secondaryDark w-32">{{
            t("documentation.auth.timestamp")
          }}</span>
          <span class="px-1">{{
            effectiveAuth.timestamp || t("documentation.not_set")
          }}</span>
        </div>
        <div class="flex items-center">
          <span class="font-medium text-secondaryDark w-32">{{
            t("documentation.auth.host")
          }}</span>
          <span class="px-1">{{
            effectiveAuth.host || t("documentation.not_set")
          }}</span>
        </div>
        <div class="flex items-center">
          <span class="font-medium text-secondaryDark w-32">{{
            t("documentation.auth.headers_to_sign")
          }}</span>
          <span class="px-1">{{
            effectiveAuth.headersToSign || t("documentation.not_set")
          }}</span>
        </div>
        <div class="flex items-center">
          <span class="font-medium text-secondaryDark w-32">{{
            t("documentation.auth.max_body_size")
          }}</span>
          <span class="px-1">{{
            effectiveAuth.maxBodySize || t("documentation.not_set")
          }}</span>
        </div>
      </div>

      <!-- JWT Auth -->
      <div v-if="effectiveAuth.authType === 'jwt'" class="space-y-2">
        <div class="flex items-center">
          <span class="font-medium text-secondaryDark w-32">{{
            t("documentation.auth.algorithm")
          }}</span>
          <span class="px-1">{{ effectiveAuth.algorithm || "HS256" }}</span>
        </div>
        <div class="flex items-center">
          <span class="font-medium text-secondaryDark w-32">{{
            t("documentation.auth.payload")
          }}</span>
          <span class="px-1 break-all">{{
            effectiveAuth.payload || t("documentation.not_set")
          }}</span>
        </div>
        <div class="flex items-center">
          <span class="font-medium text-secondaryDark w-32">{{
            t("documentation.auth.add_to")
          }}</span>
          <span
            class="px-2 py-0.5 text-xs rounded bg-divider text-secondaryDark"
          >
            {{ effectiveAuth.addTo || "HEADERS" }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { HoppRESTAuth, HoppGQLAuth } from "@hoppscotch/data"
import { useI18n } from "~/composables/i18n"
import { computed } from "vue"
import { HoppInheritedProperty } from "~/helpers/types/HoppInheritedProperties"

const t = useI18n()

const props = defineProps<{
  auth: HoppRESTAuth | HoppGQLAuth | null | undefined
  inheritedAuth?: HoppInheritedProperty["auth"]
}>()

const effectiveAuth = computed(() => {
  if (
    props.auth?.authType === "inherit" &&
    props.inheritedAuth?.inheritedAuth
  ) {
    return props.inheritedAuth.inheritedAuth
  }
  return props.auth
})

// Helper functions for OAuth 2.0
const getGrantType = () => {
  if (
    effectiveAuth.value?.authType === "oauth-2" &&
    "grantTypeInfo" in effectiveAuth.value &&
    effectiveAuth.value.grantTypeInfo
  ) {
    return effectiveAuth.value.grantTypeInfo.grantType
  }
  return undefined
}

const getAuthEndpoint = () => {
  if (
    effectiveAuth.value?.authType === "oauth-2" &&
    "grantTypeInfo" in effectiveAuth.value &&
    effectiveAuth.value.grantTypeInfo
  ) {
    return effectiveAuth.value.grantTypeInfo.authEndpoint
  }
  return undefined
}

const getTokenEndpoint = () => {
  if (
    effectiveAuth.value?.authType === "oauth-2" &&
    "grantTypeInfo" in effectiveAuth.value &&
    effectiveAuth.value.grantTypeInfo &&
    "tokenEndpoint" in effectiveAuth.value.grantTypeInfo
  ) {
    return effectiveAuth.value.grantTypeInfo.tokenEndpoint
  }
  return undefined
}

const getClientId = () => {
  if (
    effectiveAuth.value?.authType === "oauth-2" &&
    "grantTypeInfo" in effectiveAuth.value &&
    effectiveAuth.value.grantTypeInfo
  ) {
    return effectiveAuth.value.grantTypeInfo.clientID
  }
  return undefined
}

const hasClientSecret = () => {
  if (
    effectiveAuth.value?.authType === "oauth-2" &&
    "grantTypeInfo" in effectiveAuth.value &&
    effectiveAuth.value.grantTypeInfo &&
    "clientSecret" in effectiveAuth.value.grantTypeInfo
  ) {
    return !!effectiveAuth.value.grantTypeInfo.clientSecret
  }
  return false
}

const getScopes = () => {
  if (
    effectiveAuth.value?.authType === "oauth-2" &&
    "grantTypeInfo" in effectiveAuth.value &&
    effectiveAuth.value.grantTypeInfo
  ) {
    return effectiveAuth.value.grantTypeInfo.scopes
  }
  return undefined
}
</script>
