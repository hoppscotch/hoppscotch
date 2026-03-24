<template>
  <div class="flex flex-col divide-y divide-dividerLight">
    <div class="p-4">
      <label class="mb-3 block text-tiny font-semibold text-secondaryLight">
        {{ t("authorization.type") }}
      </label>
      <div class="flex flex-wrap gap-2">
        <HoppButtonSecondary
          v-for="option in authOptions"
          :key="option.value"
          :label="option.label"
          :filled="authType === option.value"
          @click="authType = option.value"
        />
      </div>
    </div>

    <div v-if="authType === 'basic'" class="space-y-4 p-4">
      <HoppSmartInput
        v-model="basicUsername"
        placeholder=" "
        :label="t('authorization.username')"
        input-styles="floating-input"
      />
      <HoppSmartInput
        v-model="basicPassword"
        type="password"
        placeholder=" "
        :label="t('authorization.password')"
        input-styles="floating-input"
      />
    </div>

    <div v-else-if="authType === 'bearer'" class="space-y-4 p-4">
      <HoppSmartInput
        v-model="bearerToken"
        type="password"
        placeholder=" "
        :label="t('authorization.token')"
        input-styles="floating-input"
      />
    </div>

    <div v-else-if="authType === 'api-key'" class="space-y-4 p-4">
      <HoppSmartInput
        v-model="apiKey"
        placeholder=" "
        :label="t('authorization.key')"
        input-styles="floating-input"
      />
      <HoppSmartInput
        v-model="apiValue"
        type="password"
        placeholder=" "
        :label="t('authorization.value')"
        input-styles="floating-input"
      />
      <div class="flex flex-col gap-2">
        <label class="text-tiny font-semibold text-secondaryLight">
          {{ t("authorization.add_to") }}
        </label>
        <div class="flex flex-wrap gap-2">
          <HoppButtonSecondary
            :label="t('authorization.pass_by_headers_label')"
            :filled="apiAddTo === 'HEADERS'"
            @click="apiAddTo = 'HEADERS'"
          />
          <HoppButtonSecondary
            :label="t('authorization.pass_by_query_params_label')"
            :filled="apiAddTo === 'QUERY_PARAMS'"
            @click="apiAddTo = 'QUERY_PARAMS'"
          />
        </div>
      </div>
    </div>

    <div v-else class="p-4 text-sm text-secondaryLight">
      {{ t("authorization.none") }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue"
import { MCPAuth } from "@hoppscotch/data"
import { useI18n } from "@composables/i18n"
import { useStream } from "@composables/stream"
import { MCPAuth$, setMCPAuth } from "~/newstore/MCPSession"

const t = useI18n()

const auth = useStream<MCPAuth>(
  MCPAuth$,
  {
    authType: "none",
    authActive: false,
  },
  setMCPAuth
)

const authOptions = computed(() => [
  {
    label: t("authorization.none"),
    value: "none",
  },
  {
    label: t("authorization.basic_auth"),
    value: "basic",
  },
  {
    label: t("authorization.bearer_token"),
    value: "bearer",
  },
  {
    label: t("authorization.api_key"),
    value: "api-key",
  },
])

const basicUsername = ref("")
const basicPassword = ref("")
const bearerToken = ref("")
const apiKey = ref("")
const apiValue = ref("")
const apiAddTo = ref<"HEADERS" | "QUERY_PARAMS">("HEADERS")

watch(
  auth,
  (currentAuth) => {
    if (currentAuth.authType === "basic") {
      basicUsername.value = currentAuth.username
      basicPassword.value = currentAuth.password
      return
    }

    if (currentAuth.authType === "bearer") {
      bearerToken.value = currentAuth.token
      return
    }

    if (currentAuth.authType === "api-key") {
      apiKey.value = currentAuth.key
      apiValue.value = currentAuth.value
      apiAddTo.value = currentAuth.addTo
    }
  },
  { immediate: true }
)

const authType = computed({
  get: () => auth.value.authType,
  set: (value: MCPAuth["authType"]) => {
    if (value === "none") {
      setMCPAuth({
        authType: "none",
        authActive: false,
      })
      return
    }

    if (value === "basic") {
      setMCPAuth({
        authType: "basic",
        authActive: true,
        username: basicUsername.value,
        password: basicPassword.value,
      })
      return
    }

    if (value === "bearer") {
      setMCPAuth({
        authType: "bearer",
        authActive: true,
        token: bearerToken.value,
      })
      return
    }

    setMCPAuth({
      authType: "api-key",
      authActive: true,
      key: apiKey.value,
      value: apiValue.value,
      addTo: apiAddTo.value,
    })
  },
})

watch([basicUsername, basicPassword], ([username, password]) => {
  if (auth.value.authType !== "basic") {
    return
  }

  setMCPAuth({
    authType: "basic",
    authActive: true,
    username,
    password,
  })
})

watch(bearerToken, (token) => {
  if (auth.value.authType !== "bearer") {
    return
  }

  setMCPAuth({
    authType: "bearer",
    authActive: true,
    token,
  })
})

watch([apiKey, apiValue, apiAddTo], ([key, value, addTo]) => {
  if (auth.value.authType !== "api-key") {
    return
  }

  setMCPAuth({
    authType: "api-key",
    authActive: true,
    key,
    value,
    addTo,
  })
})
</script>
