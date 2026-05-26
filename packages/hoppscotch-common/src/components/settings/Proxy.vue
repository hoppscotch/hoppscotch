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
import { ref, computed, watch } from "vue"
import { refAutoReset } from "@vueuse/core"
import { useService } from "dioc/vue"

import { useI18n } from "~/composables/i18n"
import { useToast } from "~/composables/toast"
import { useReadonlyStream } from "~/composables/stream"
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

// Local editable copy, synced from the reactive store
const proxyUrl = ref(store.settings$.value.proxyUrl)

// When the store's settings change (e.g. async init resolves, or external
// tab updates via the Store watcher), keep the local input in sync —
// but only if the user hasn't actively edited it to something different.
watch(
  () => store.settings$.value.proxyUrl,
  (storeUrl, prevStoreUrl) => {
    // Don't overwrite user edits, only sync when local still matches
    // the previous store value (i.e. user hasn't typed anything new)
    if (proxyUrl.value === "" || proxyUrl.value === prevStoreUrl) {
      proxyUrl.value = storeUrl
    }
  },
  { immediate: true }
)

const currentUser = useReadonlyStream(
  platform.auth.getCurrentUserStream(),
  platform.auth.getCurrentUser()
)

// Reset proxy settings to platform defaults when user logs out.
// Force-sync the local ref after reset — the settings$ watch has a guard
// that skips sync when the user has unsaved local edits, but logout should
// unconditionally reset the input.
watch(currentUser, async (user) => {
  if (!user) {
    await store.resetSettings()
    proxyUrl.value = store.settings$.value.proxyUrl
  }
})

const enabled = computed(
  () => interceptorService.getCurrentId() === proxyInterceptorService.id
)

const clearIcon = refAutoReset<typeof IconRotateCCW | typeof IconCheck>(
  IconRotateCCW,
  1000
)

async function updateProxyUrl() {
  await store.updateSettings({ proxyUrl: proxyUrl.value })
  toast.success(t("state.saved"))
}

async function resetSettings() {
  await store.resetSettings()
  // Store is reactive — settings$ already updated, just sync local ref
  proxyUrl.value = store.settings$.value.proxyUrl
  clearIcon.value = IconCheck
  toast.success(t("state.cleared"))
}
</script>
