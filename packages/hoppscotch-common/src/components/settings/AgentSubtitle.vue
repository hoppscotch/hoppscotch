<template>
  <div
    v-if="isSelected"
    class="flex flex-col items-left my-2 text-secondaryLight"
  >
    <div
      v-if="
        !store.authKey.value &&
        store.hasInitiatedRegistration.value &&
        store.hasCheckedAgent.value
      "
      class="flex flex-1 items-center space-x-2"
    >
      <HoppSmartInput
        v-model="store.registrationOTP.value"
        :autofocus="false"
        :placeholder="' '"
        :disabled="store.isRegistering.value"
        :label="t('settings.enter_otp')"
        input-styles="input floating-input"
        class="flex-1"
      />
      <HoppButtonSecondary
        v-tippy="{ theme: 'tooltip' }"
        :title="t('action.confirm')"
        :icon="IconCheck"
        :loading="store.isRegistering.value"
        outline
        class="rounded"
        @click="register"
      />
    </div>

    <div
      v-else-if="store.maskedAuthKey.value"
      class="flex relative flex-1 items-center space-x-2"
    >
      <label
        class="text-secondaryLight text-tiny absolute -top-2 left-2 px-1"
        >{{ t("settings.agent_registered") }}</label
      >
      <div
        class="w-full p-2 border border-dividerLight rounded bg-primary text-secondaryDark cursor-text select-all"
      >
        {{ store.maskedAuthKey.value }}
      </div>
      <HoppButtonSecondary
        v-tippy="{ theme: 'tooltip' }"
        :title="t('settings.agent_discard_registration')"
        :icon="IconClose"
        outline
        class="rounded"
        @click="resetRegistration"
      />
    </div>

    <div v-else>
      <HoppButtonSecondary
        :icon="IconPlus"
        :label="t('settings.register_agent')"
        outline
        class="rounded"
        @click="handleAgentCheck"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from "vue"
import { useService } from "dioc/vue"
import { useI18n } from "@composables/i18n"
import { useToast } from "@composables/toast"
import { KernelInterceptorAgentStore } from "~/platform/std/kernel-interceptors/agent/store"
import { KernelInterceptorService } from "~/services/kernel-interceptor.service"

import IconPlus from "~icons/lucide/plus"
import IconCheck from "~icons/lucide/check"
import IconClose from "~icons/lucide/x"

const t = useI18n()
const toast = useToast()
const store = useService(KernelInterceptorAgentStore)
const interceptorService = useService(KernelInterceptorService)

const isSelected = computed(
  () => interceptorService.current.value?.id === "agent"
)

const handleAgentCheck = async () => {
  try {
    await store.checkAgentStatus()
    store.hasCheckedAgent.value = true
    if (!store.isAgentRunning.value) {
      toast.error(t("settings.agent_not_running"))
    } else {
      await initiateRegistration()
    }
  } catch {
    store.hasCheckedAgent.value = false
    toast.error(t("settings.agent_check_failed"))
  }
}

const initiateRegistration = async () => {
  try {
    await store.initiateRegistration()
    store.hasInitiatedRegistration.value = true
    toast.success(t("settings.agent_running"))
  } catch (e: unknown) {
    if (e instanceof Error) {
      if (e.message === "There is already an existing registration happening") {
        toast.error(t("settings.agent_registration_already_in_progress"))
      } else {
        toast.error(t("settings.agent_registration_failed"))
      }
    }
  }
}

const register = async () => {
  if (!store.registrationOTP.value) return
  store.isRegistering.value = true
  try {
    await store.verifyRegistration(store.registrationOTP.value)
    await updateMaskedAuthKey()
    toast.success(t("settings.agent_registration_successful"))
    store.registrationOTP.value = ""
  } catch (e) {
  } finally {
    store.isRegistering.value = false
  }
}

const resetRegistration = async () => {
  await store.resetAuthKey()
  store.maskedAuthKey.value = ""
  store.registrationOTP.value = ""
  store.hasInitiatedRegistration.value = false
  store.hasCheckedAgent.value = false
}

const updateMaskedAuthKey = async () => {
  if (!store.authKey.value) return

  try {
    const registration = await store.fetchRegistrationInfo()
    store.maskedAuthKey.value = registration.auth_key_hash
  } catch (e) {}
}

onMounted(async () => {
  if (store.authKey.value) {
    await updateMaskedAuthKey()
  }
})
</script>
