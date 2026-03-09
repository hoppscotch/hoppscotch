<template>
  <div class="flex flex-col">
    <!-- Auth Type Selector -->
    <div class="p-4 border-b border-dividerLight">
      <label
        class="text-xs font-semibold text-secondaryLight uppercase mb-2 block"
      >
        {{ t("authorization.type") }}
      </label>
      <div class="flex flex-wrap gap-2">
        <HoppButtonSecondary
          v-for="option in authTypes"
          :key="option.value"
          :label="option.label"
          :filled="authType === option.value"
          @click="authType = option.value"
        />
      </div>
    </div>

    <!-- None -->
    <div
      v-if="auth.authType === 'none'"
      class="p-4 text-center text-secondaryLight"
    >
      {{ t("authorization.none") }}
    </div>

    <!-- Basic Auth -->
    <div v-if="auth.authType === 'basic'" class="flex flex-col space-y-4 p-4">
      <div class="flex flex-col space-y-2">
        <label class="text-xs font-semibold text-secondaryLight uppercase">
          {{ t("authorization.username") }}
        </label>
        <input
          v-model="basicUsername"
          class="flex w-full bg-primaryLight px-4 py-2 border rounded border-divider"
          :placeholder="t('authorization.username')"
          type="text"
        />
      </div>
      <div class="flex flex-col space-y-2">
        <label class="text-xs font-semibold text-secondaryLight uppercase">
          {{ t("authorization.password") }}
        </label>
        <input
          v-model="basicPassword"
          class="flex w-full bg-primaryLight px-4 py-2 border rounded border-divider"
          :placeholder="t('authorization.password')"
          type="password"
        />
      </div>
    </div>

    <!-- Bearer Token -->
    <div v-if="auth.authType === 'bearer'" class="flex flex-col space-y-4 p-4">
      <div class="flex flex-col space-y-2">
        <label class="text-xs font-semibold text-secondaryLight uppercase">
          {{ t("authorization.token") }}
        </label>
        <input
          v-model="bearerToken"
          class="flex w-full bg-primaryLight px-4 py-2 border rounded border-divider"
          :placeholder="t('authorization.token')"
          type="password"
        />
      </div>
    </div>

    <!-- API Key -->
    <div v-if="auth.authType === 'api-key'" class="flex flex-col space-y-4 p-4">
      <div class="flex flex-col space-y-2">
        <label class="text-xs font-semibold text-secondaryLight uppercase">
          {{ t("authorization.key") }}
        </label>
        <input
          v-model="apiKey"
          class="flex w-full bg-primaryLight px-4 py-2 border rounded border-divider"
          :placeholder="t('authorization.key')"
          type="text"
        />
      </div>
      <div class="flex flex-col space-y-2">
        <label class="text-xs font-semibold text-secondaryLight uppercase">
          {{ t("authorization.value") }}
        </label>
        <input
          v-model="apiValue"
          class="flex w-full bg-primaryLight px-4 py-2 border rounded border-divider"
          :placeholder="t('authorization.value')"
          type="password"
        />
      </div>
      <div class="flex flex-col space-y-2">
        <label class="text-xs font-semibold text-secondaryLight uppercase">
          {{ t("authorization.add_to") }}
        </label>
        <div class="flex gap-2">
          <HoppButtonSecondary
            label="Headers"
            :filled="apiAddTo === 'HEADERS'"
            @click="apiAddTo = 'HEADERS'"
          />
          <HoppButtonSecondary
            label="Query Parameters"
            :filled="apiAddTo === 'QUERY_PARAMS'"
            @click="apiAddTo = 'QUERY_PARAMS'"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from "vue"
import { useI18n } from "@composables/i18n"
import { useStream } from "@composables/stream"
import { MCPAuth$, setMCPAuth } from "~/newstore/MCPSession"

const t = useI18n()

const auth = useStream(
  MCPAuth$,
  { authType: "none", authActive: false },
  setMCPAuth
)

const authTypes = computed(() => [
  { label: t("authorization.none"), value: "none" },
  { label: t("authorization.basic_auth"), value: "basic" },
  { label: t("authorization.bearer_token"), value: "bearer" },
  { label: t("authorization.api_key"), value: "api-key" },
])

const authType = computed({
  get: () => auth.value.authType,
  set: (value: "none" | "basic" | "bearer" | "api-key") => {
    setMCPAuth({
      authType: value,
      authActive: value !== "none",
    })
  },
})

const basicUsername = ref("")
const basicPassword = ref("")
const bearerToken = ref("")
const apiKey = ref("")
const apiValue = ref("")
const apiAddTo = ref<"HEADERS" | "QUERY_PARAMS">("HEADERS")

// Initialize from auth state
watch(
  auth,
  (newAuth) => {
    if (newAuth.authType === "basic") {
      basicUsername.value = newAuth.username || ""
      basicPassword.value = newAuth.password || ""
    } else if (newAuth.authType === "bearer") {
      bearerToken.value = newAuth.token || ""
    } else if (newAuth.authType === "api-key") {
      apiKey.value = newAuth.key || ""
      apiValue.value = newAuth.value || ""
      apiAddTo.value = newAuth.addTo || "HEADERS"
    }
  },
  { immediate: true }
)

// Update auth when fields change
watch([basicUsername, basicPassword], () => {
  if (auth.value.authType === "basic") {
    setMCPAuth({
      authType: "basic",
      authActive: true,
      username: basicUsername.value,
      password: basicPassword.value,
    })
  }
})

watch(bearerToken, () => {
  if (auth.value.authType === "bearer") {
    setMCPAuth({
      authType: "bearer",
      authActive: true,
      token: bearerToken.value,
    })
  }
})

watch([apiKey, apiValue, apiAddTo], () => {
  if (auth.value.authType === "api-key") {
    setMCPAuth({
      authType: "api-key",
      authActive: true,
      key: apiKey.value,
      value: apiValue.value,
      addTo: apiAddTo.value,
    })
  }
})
</script>
