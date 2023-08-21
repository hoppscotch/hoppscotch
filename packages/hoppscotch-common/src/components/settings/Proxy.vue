<template>
  <div class="my-1 text-secondaryLight">
    {{ `${t("settings.official_proxy_hosting")} ${t("settings.read_the")}` }}
    <HoppSmartAnchor
      class="link"
      to="https://docs.hoppscotch.io/support/privacy"
      blank
      :label="t('app.proxy_privacy_policy')"
    />.
  </div>
  <div class="py-4 space-y-4">
    <div class="flex items-center">
      <HoppSmartToggle
        :on="proxyEnabled"
        @change="proxyEnabled = !proxyEnabled"
      >
        {{ t("settings.proxy_use_toggle") }}
      </HoppSmartToggle>
    </div>
  </div>
  <div class="flex items-center py-4 space-x-2">
    <HoppSmartInput
      v-model="PROXY_URL"
      styles="flex-1"
      placeholder=" "
      input-styles="input floating-input"
      :disabled="!proxyEnabled"
    >
      <template #label>
        <label for="url">
          {{ t("settings.proxy_url") }}
        </label>
      </template>
    </HoppSmartInput>
    <HoppButtonSecondary
      v-tippy="{ theme: 'tooltip' }"
      :title="t('settings.reset_default')"
      :icon="clearIcon"
      outline
      class="rounded"
      @click="resetProxy"
    />
  </div>
</template>

<script setup lang="ts">
import { refAutoReset } from "@vueuse/core"
import { useI18n } from "~/composables/i18n"
import { useSetting } from "~/composables/settings"
import IconRotateCCW from "~icons/lucide/rotate-ccw"
import IconCheck from "~icons/lucide/check"
import { useToast } from "~/composables/toast"
import { computed } from "vue"
import { useService } from "dioc/vue"
import { InterceptorService } from "~/services/interceptor.service"
import { proxyInterceptor } from "~/platform/std/interceptors/proxy"
import { platform } from "~/platform"

const t = useI18n()
const toast = useToast()

const interceptorService = useService(InterceptorService)

const PROXY_URL = useSetting("PROXY_URL")

const proxyEnabled = computed({
  get() {
    return (
      interceptorService.currentInterceptorID.value ===
      proxyInterceptor.interceptorID
    )
  },
  set(active) {
    if (active) {
      interceptorService.currentInterceptorID.value =
        proxyInterceptor.interceptorID
    } else {
      interceptorService.currentInterceptorID.value =
        platform.interceptors.default
    }
  },
})

const clearIcon = refAutoReset<typeof IconRotateCCW | typeof IconCheck>(
  IconRotateCCW,
  1000
)

const resetProxy = () => {
  PROXY_URL.value = "https://proxy.hoppscotch.io/"
  clearIcon.value = IconCheck
  toast.success(`${t("state.cleared")}`)
}
</script>
