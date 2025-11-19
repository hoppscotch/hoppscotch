<template>
  <div
    v-if="
      auth &&
      auth.authActive &&
      auth.authType !== 'none' &&
      auth.authType !== 'inherit'
    "
    class="max-w-2xl space-y-2"
  >
    <h2
      class="text-sm font-semibold text-secondaryDark flex items-end px-4 p-2 border-b border-divider"
    >
      <span class="w-32">Authorization</span>
      <span
        class="text-xs rounded text-secondary font-medium uppercase border border-divider px-2 py-1 bg-primaryLight shadow-md"
      >
        {{ auth.authType }}
      </span>
    </h2>
    <div class="px-4 py-2 flex flex-col">
      <div class="space-y-3">
        <!-- Basic Auth -->
        <div v-if="auth.authType === 'basic'" class="space-y-2">
          <div class="flex items-center">
            <span class="font-medium text-secondaryDark w-32">Username:</span>
            <span class="px-1">{{ auth.username || "Not set" }}</span>
          </div>
          <div class="flex items-center">
            <span class="font-medium text-secondaryDark w-32">Password:</span>
            <span class="px-1">••••••••</span>
          </div>
        </div>

        <!-- Bearer Token -->
        <div v-if="auth.authType === 'bearer'" class="space-y-2">
          <div class="flex items-center">
            <span class="font-medium text-secondaryDark w-32">Token:</span>
            <span class="px-1">••••••••</span>
          </div>
        </div>

        <!-- API Key -->
        <div v-if="auth.authType === 'api-key'" class="space-y-2">
          <div class="flex items-center">
            <span class="font-medium text-secondaryDark w-32">Key:</span>
            <span class="px-1">{{ auth.key || "Not set" }}</span>
          </div>
          <div class="flex items-center">
            <span class="font-medium text-secondaryDark w-32">Value:</span>
            <span class="px-1">{{ auth.value ? "••••••••" : "Not set" }}</span>
          </div>
          <div class="flex items-center">
            <span class="font-medium text-secondaryDark w-32">Add to:</span>
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
            <span class="font-medium text-secondaryDark w-32">Grant Type:</span>
            <span class="px-1">{{ getGrantType() || "Not set" }}</span>
          </div>
          <div class="flex items-center">
            <span class="font-medium text-secondaryDark w-32">Auth URL:</span>
            <span class="px-1 text-xs break-all">{{
              getAuthEndpoint() || "Not set"
            }}</span>
          </div>
          <div class="flex items-center">
            <span class="font-medium text-secondaryDark w-32">Token URL:</span>
            <span class="px-1 text-xs break-all">{{
              getTokenEndpoint() || "Not set"
            }}</span>
          </div>
          <div class="flex items-center">
            <span class="font-medium text-secondaryDark w-32">Client ID:</span>
            <span class="px-1">{{ getClientId() || "Not set" }}</span>
          </div>
          <div class="flex items-center">
            <span class="font-medium text-secondaryDark w-32"
              >Client Secret:</span
            >
            <span class="px-1">{{
              hasClientSecret() ? "••••••••" : "Not set"
            }}</span>
          </div>
          <div class="flex items-center">
            <span class="font-medium text-secondaryDark w-32">Scope:</span>
            <span class="px-1">{{ getScopes() || "Not set" }}</span>
          </div>
        </div>
      </div>

      <!-- Digest Auth -->
      <div v-if="auth.authType === 'digest'" class="space-y-2">
        <div class="flex items-center">
          <span class="font-medium text-secondaryDark w-32">Username:</span>
          <span class="px-1">{{ auth.username || "Not set" }}</span>
        </div>
        <div class="flex items-center">
          <span class="font-medium text-secondaryDark w-32">Password:</span>
          <span class="px-1">••••••••</span>
        </div>
        <div class="flex items-center">
          <span class="font-medium text-secondaryDark w-32">Realm:</span>
          <span class="px-1">{{ auth.realm || "Not set" }}</span>
        </div>
        <div class="flex items-center">
          <span class="font-medium text-secondaryDark w-32">Nonce:</span>
          <span class="px-1">{{ auth.nonce || "Not set" }}</span>
        </div>
        <div class="flex items-center">
          <span class="font-medium text-secondaryDark w-32">Algorithm:</span>
          <span class="px-1">{{ auth.algorithm || "MD5" }}</span>
        </div>
        <div class="flex items-center">
          <span class="font-medium text-secondaryDark w-32">QOP:</span>
          <span class="px-1">{{ auth.qop || "auth" }}</span>
        </div>
        <div class="flex items-center">
          <span class="font-medium text-secondaryDark w-32">Client Nonce:</span>
          <span class="px-1">{{ auth.cnonce || "Not set" }}</span>
        </div>
        <div class="flex items-center">
          <span class="font-medium text-secondaryDark w-32">Opaque:</span>
          <span class="px-1">{{ auth.opaque || "Not set" }}</span>
        </div>
      </div>

      <!-- AWS Signature -->
      <div v-if="auth.authType === 'aws-signature'" class="space-y-2">
        <div class="flex items-center">
          <span class="font-medium text-secondaryDark w-32">Access Key:</span>
          <span class="px-1">{{ auth.accessKey || "Not set" }}</span>
        </div>
        <div class="flex items-center">
          <span class="font-medium text-secondaryDark w-32">Secret Key:</span>
          <span class="px-1">••••••••</span>
        </div>
        <div class="flex items-center">
          <span class="font-medium text-secondaryDark w-32">Region:</span>
          <span class="px-1">{{ auth.region || "Not set" }}</span>
        </div>
        <div class="flex items-center">
          <span class="font-medium text-secondaryDark w-32">Service Name:</span>
          <span class="px-1">{{ auth.serviceName || "Not set" }}</span>
        </div>
        <div class="flex items-center">
          <span class="font-medium text-secondaryDark w-32">Add to:</span>
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
          <span class="font-medium text-secondaryDark w-32">Auth ID:</span>
          <span class="px-1">{{ auth.authId || "Not set" }}</span>
        </div>
        <div class="flex items-center">
          <span class="font-medium text-secondaryDark w-32">Auth Key:</span>
          <span class="px-1">••••••••</span>
        </div>
        <div class="flex items-center">
          <span class="font-medium text-secondaryDark w-32">Algorithm:</span>
          <span class="px-1">{{ auth.algorithm || "sha256" }}</span>
        </div>
        <div class="flex items-center">
          <span class="font-medium text-secondaryDark w-32">User:</span>
          <span class="px-1">{{ auth.user || "Not set" }}</span>
        </div>
        <div class="flex items-center">
          <span class="font-medium text-secondaryDark w-32">Nonce:</span>
          <span class="px-1">{{ auth.nonce || "Not set" }}</span>
        </div>
        <div class="flex items-center">
          <span class="font-medium text-secondaryDark w-32">Extra Data:</span>
          <span class="px-1">{{ auth.ext || "Not set" }}</span>
        </div>
        <div class="flex items-center">
          <span class="font-medium text-secondaryDark w-32">App ID:</span>
          <span class="px-1">{{ auth.app || "Not set" }}</span>
        </div>
        <div class="flex items-center">
          <span class="font-medium text-secondaryDark w-32">Delegation:</span>
          <span class="px-1">{{ auth.dlg || "Not set" }}</span>
        </div>
        <div class="flex items-center">
          <span class="font-medium text-secondaryDark w-32">Timestamp:</span>
          <span class="px-1">{{ auth.timestamp || "Not set" }}</span>
        </div>
        <div class="flex items-center">
          <span class="font-medium text-secondaryDark w-32"
            >Include Payload Hash:</span
          >
          <span class="px-1">{{ auth.includePayloadHash ? "Yes" : "No" }}</span>
        </div>
      </div>

      <!-- Akamai EdgeGrid -->
      <div v-if="auth.authType === 'akamai-eg'" class="space-y-2">
        <div class="flex items-center">
          <span class="font-medium text-secondaryDark w-32">Access Token:</span>
          <span class="px-1">••••••••</span>
        </div>
        <div class="flex items-center">
          <span class="font-medium text-secondaryDark w-32">Client Token:</span>
          <span class="px-1">••••••••</span>
        </div>
        <div class="flex items-center">
          <span class="font-medium text-secondaryDark w-32"
            >Client Secret:</span
          >
          <span class="px-1">••••••••</span>
        </div>
        <div class="flex items-center">
          <span class="font-medium text-secondaryDark w-32">Nonce:</span>
          <span class="px-1">{{ auth.nonce || "Not set" }}</span>
        </div>
        <div class="flex items-center">
          <span class="font-medium text-secondaryDark w-32">Timestamp:</span>
          <span class="px-1">{{ auth.timestamp || "Not set" }}</span>
        </div>
        <div class="flex items-center">
          <span class="font-medium text-secondaryDark w-32">Host:</span>
          <span class="px-1">{{ auth.host || "Not set" }}</span>
        </div>
        <div class="flex items-center">
          <span class="font-medium text-secondaryDark w-32"
            >Headers to Sign:</span
          >
          <span class="px-1">{{ auth.headersToSign || "Not set" }}</span>
        </div>
        <div class="flex items-center">
          <span class="font-medium text-secondaryDark w-32"
            >Max Body Size:</span
          >
          <span class="px-1">{{ auth.maxBodySize || "Not set" }}</span>
        </div>
      </div>

      <!-- JWT Auth -->
      <div v-if="auth.authType === 'jwt'" class="space-y-2">
        <div class="flex items-center">
          <span class="font-medium text-secondaryDark w-32">Algorithm:</span>
          <span class="px-1">{{ auth.algorithm || "HS256" }}</span>
        </div>
        <div class="flex items-center">
          <span class="font-medium text-secondaryDark w-32">Payload:</span>
          <span class="px-1 break-all">{{ auth.payload || "Not set" }}</span>
        </div>
        <div class="flex items-center">
          <span class="font-medium text-secondaryDark w-32">Add to:</span>
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
