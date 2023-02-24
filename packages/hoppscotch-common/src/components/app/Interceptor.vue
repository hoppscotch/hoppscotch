<template>
  <div class="flex flex-col space-y-2">
    <div class="flex flex-col px-4 pt-2">
      <h2 class="inline-flex pb-1 font-semibold text-secondaryDark">
        {{ t("settings.interceptor") }}
      </h2>
      <p class="inline-flex text-tiny">
        {{ t("settings.interceptor_description") }}
      </p>
    </div>
    <HoppSmartRadioGroup
      v-model="interceptorSelection"
      :radios="interceptors"
    />
    <div
      v-if="interceptorSelection == 'EXTENSIONS_ENABLED' && !extensionVersion"
      class="flex space-x-2"
    >
      <HoppButtonSecondary
        to="https://chrome.google.com/webstore/detail/hoppscotch-browser-extens/amknoiejhlmhancpahfcfcfhllgkpbld"
        blank
        :icon="IconChrome"
        label="Chrome"
        outline
        class="!flex-1"
      />
      <HoppButtonSecondary
        to="https://addons.mozilla.org/en-US/firefox/addon/hoppscotch"
        blank
        :icon="IconFirefox"
        label="Firefox"
        outline
        class="!flex-1"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import IconChrome from "~icons/brands/chrome"
import IconFirefox from "~icons/brands/firefox"
import { computed } from "vue"
import { applySetting, toggleSetting } from "~/newstore/settings"
import { useSetting } from "@composables/settings"
import { useI18n } from "@composables/i18n"
import { useReadonlyStream } from "@composables/stream"
import { extensionStatus$ } from "~/newstore/HoppExtension"

const t = useI18n()

const PROXY_ENABLED = useSetting("PROXY_ENABLED")
const EXTENSIONS_ENABLED = useSetting("EXTENSIONS_ENABLED")

const currentExtensionStatus = useReadonlyStream(extensionStatus$, null)

const extensionVersion = computed(() => {
  return currentExtensionStatus.value === "available"
    ? window.__POSTWOMAN_EXTENSION_HOOK__?.getVersion() ?? null
    : null
})

const interceptors = computed(() => [
  { value: "BROWSER_ENABLED" as const, label: t("state.none") },
  { value: "PROXY_ENABLED" as const, label: t("settings.proxy") },
  {
    value: "EXTENSIONS_ENABLED" as const,
    label:
      `${t("settings.extensions")}: ` +
      (extensionVersion.value !== null
        ? `v${extensionVersion.value.major}.${extensionVersion.value.minor}`
        : t("settings.extension_ver_not_reported")),
  },
])

type InterceptorMode = (typeof interceptors)["value"][number]["value"]

const interceptorSelection = computed<InterceptorMode>({
  get() {
    if (PROXY_ENABLED.value) return "PROXY_ENABLED"
    if (EXTENSIONS_ENABLED.value) return "EXTENSIONS_ENABLED"
    return "BROWSER_ENABLED"
  },
  set(val) {
    if (val === "EXTENSIONS_ENABLED") {
      applySetting("EXTENSIONS_ENABLED", true)
      if (PROXY_ENABLED.value) toggleSetting("PROXY_ENABLED")
    }
    if (val === "PROXY_ENABLED") {
      applySetting("PROXY_ENABLED", true)
      if (EXTENSIONS_ENABLED.value) toggleSetting("EXTENSIONS_ENABLED")
    }
    if (val === "BROWSER_ENABLED") {
      applySetting("PROXY_ENABLED", false)
      applySetting("EXTENSIONS_ENABLED", false)
    }
  },
})
</script>
