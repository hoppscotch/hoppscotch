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
  <div class="flex items-center space-x-2 py-4">
    <HoppSmartInput
      v-model="proxyUrl"
      :autofocus="false"
      styles="flex-1"
      :placeholder="' '"
      :label="t('settings.proxy_url')"
      input-styles="input floating-input"
      :disabled="!enabled"
      @change="updateProxyUrl"
    />
    <HoppButtonSecondary
      v-tippy="{ theme: 'tooltip' }"
      :title="t('settings.reset_default')"
      :icon="clearIcon"
      outline
      class="rounded"
      @click="resetSettings"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from "vue"
import { refAutoReset } from "@vueuse/core"

import { useService } from "dioc/vue"

import { useI18n } from "~/composables/i18n"
import { useToast } from "~/composables/toast"
import { useReadonlyStream } from "~/composables/stream"
import { getDefaultProxyUrl } from "~/helpers/proxyUrl"
import { platform } from "~/platform"

import { KernelInterceptorProxyStore } from "~/platform/std/kernel-interceptors/proxy/store"
import { ProxyKernelInterceptorService } from "~/platform/std/kernel-interceptors/proxy/index"

import { KernelInterceptorService } from "~/services/kernel-interceptor.service"

import IconRotateCCW from "~icons/lucide/rotate-ccw"
import IconCheck from "~icons/lucide/check"

const t = useI18n()
const toast = useToast()

const store = useService(KernelInterceptorProxyStore)
const interceptorService = useService(KernelInterceptorService)
const proxyInterceptorService = useService(ProxyKernelInterceptorService)

const proxyUrl = ref("")

const currentUser = useReadonlyStream(
  platform.auth.getCurrentUserStream(),
  platform.auth.getCurrentUser()
)

async function updateProxyUrl() {
  await store.updateSettings({ proxyUrl: proxyUrl.value })
  toast.success(t("state.saved"))
}

watch(
  () => currentUser.value,
  async () => {
    if (!currentUser.value) {
      proxyUrl.value = await getDefaultProxyUrl()
    }
  }
)

const enabled = computed(
  () => interceptorService.getCurrentId() === proxyInterceptorService.id
)

const clearIcon = refAutoReset<typeof IconRotateCCW | typeof IconCheck>(
  IconRotateCCW,
  1000
)

async function resetSettings() {
  await store.resetSettings()
  const settings = store.getSettings()
  proxyUrl.value = settings.proxyUrl
  clearIcon.value = IconCheck
  toast.success(t("state.cleared"))
}

onMounted(async () => {
  const settings = store.getSettings()
  proxyUrl.value = settings.proxyUrl
})
</script>
