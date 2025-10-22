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
            <code class="px-1">{{ auth.username || "Not set" }}</code>
          </div>
          <div class="flex items-center">
            <span class="font-medium text-secondaryDark w-32">Password:</span>
            <code class="px-1">••••••••</code>
          </div>
        </div>

        <!-- Bearer Token -->
        <div v-if="auth.authType === 'bearer'" class="space-y-2">
          <div class="flex items-center">
            <span class="font-medium text-secondaryDark w-32">Token:</span>
            <code class="text-accent font-mono px-1">{{
              auth.token ? "••••••••" : "Not set"
            }}</code>
          </div>
        </div>

        <!-- API Key -->
        <div v-if="auth.authType === 'api-key'" class="space-y-2">
          <div class="flex items-center">
            <span class="font-medium text-secondaryDark w-32">Key:</span>
            <code class="px-1">{{ auth.key || "Not set" }}</code>
          </div>
          <div class="flex items-center">
            <span class="font-medium text-secondaryDark w-32">Value:</span>
            <code class="px-1">{{ auth.value ? "••••••••" : "Not set" }}</code>
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
            <span class="text-secondaryLight">{{
              getGrantType() || "Not set"
            }}</span>
          </div>
          <div v-if="getAuthEndpoint()" class="flex items-center">
            <span class="font-medium text-secondaryDark w-32">Auth URL:</span>
            <code class="px-1 text-xs break-all">{{ getAuthEndpoint() }}</code>
          </div>
          <div v-if="getTokenEndpoint()" class="flex items-center">
            <span class="font-medium text-secondaryDark w-32">Token URL:</span>
            <code class="px-1 text-xs break-all">{{ getTokenEndpoint() }}</code>
          </div>
          <div v-if="getClientId()" class="flex items-center">
            <span class="font-medium text-secondaryDark w-32">Client ID:</span>
            <code class="px-1">{{ getClientId() }}</code>
          </div>
          <div class="flex items-center">
            <span class="font-medium text-secondaryDark w-32"
              >Client Secret:</span
            >
            <code class="px-1">{{
              hasClientSecret() ? "••••••••" : "Not set"
            }}</code>
          </div>
          <div v-if="getScopes()" class="flex items-center">
            <span class="font-medium text-secondaryDark w-32">Scope:</span>
            <code class="px-1">{{ getScopes() }}</code>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { HoppRESTAuth } from "@hoppscotch/data"

const props = defineProps<{
  auth: HoppRESTAuth | null | undefined
}>()

// Helper functions for OAuth 2.0
const getGrantType = () => {
  if (props.auth?.authType === "oauth-2" && "grantTypeInfo" in props.auth) {
    return props.auth.grantTypeInfo?.grantType
  }
  return undefined
}

const getAuthEndpoint = () => {
  if (props.auth?.authType === "oauth-2" && "grantTypeInfo" in props.auth) {
    return props.auth.grantTypeInfo?.authEndpoint
  }
  return undefined
}

const getTokenEndpoint = () => {
  if (props.auth?.authType === "oauth-2" && "grantTypeInfo" in props.auth) {
    return props.auth.grantTypeInfo?.tokenEndpoint
  }
  return undefined
}

const getClientId = () => {
  if (props.auth?.authType === "oauth-2" && "grantTypeInfo" in props.auth) {
    return props.auth.grantTypeInfo?.clientID
  }
  return undefined
}

const hasClientSecret = () => {
  if (props.auth?.authType === "oauth-2" && "grantTypeInfo" in props.auth) {
    return !!props.auth.grantTypeInfo?.clientSecret
  }
  return false
}

const getScopes = () => {
  if (props.auth?.authType === "oauth-2" && "grantTypeInfo" in props.auth) {
    return props.auth.grantTypeInfo?.scopes
  }
  return undefined
}
</script>
