<template>
  <div class="flex flex-col p-4 space-y-4">
    <div class="flex flex-col">
      <h2 class="inline-flex pb-1 font-semibold text-secondaryDark">
        {{ t("settings.interceptor") }}
      </h2>
      <p class="inline-flex text-tiny">
        {{ t("settings.interceptor_description") }}
      </p>
    </div>
    <SmartRadioGroup
      :radios="interceptors"
      :selected="interceptorSelection"
      @change="toggleSettingKey"
    />
    <div
      v-if="interceptorSelection == 'EXTENSIONS_ENABLED' && !extensionVersion"
      class="flex space-x-2"
    >
      <ButtonSecondary
        to="https://chrome.google.com/webstore/detail/hoppscotch-browser-extens/amknoiejhlmhancpahfcfcfhllgkpbld"
        blank
        svg="brands/chrome"
        label="Chrome"
        outline
        class="!flex-1"
      />
      <ButtonSecondary
        to="https://addons.mozilla.org/en-US/firefox/addon/hoppscotch"
        blank
        svg="brands/firefox"
        label="Firefox"
        outline
        class="!flex-1"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watchEffect } from "@nuxtjs/composition-api"
import { KeysMatching } from "~/types/ts-utils"
import {
  applySetting,
  SettingsType,
  toggleSetting,
  useSetting,
} from "~/newstore/settings"
import { hasExtensionInstalled } from "~/helpers/strategies/ExtensionStrategy"
import { useI18n, usePolled } from "~/helpers/utils/composables"

const t = useI18n()

const PROXY_ENABLED = useSetting("PROXY_ENABLED")
const EXTENSIONS_ENABLED = useSetting("EXTENSIONS_ENABLED")

const toggleSettingKey = <
  K extends KeysMatching<SettingsType | "BROWSER_ENABLED", boolean>
>(
  key: K
) => {
  interceptorSelection.value = key
  if (key === "EXTENSIONS_ENABLED") {
    applySetting("EXTENSIONS_ENABLED", true)
    if (PROXY_ENABLED.value) toggleSetting("PROXY_ENABLED")
  }
  if (key === "PROXY_ENABLED") {
    applySetting("PROXY_ENABLED", true)
    if (EXTENSIONS_ENABLED.value) toggleSetting("EXTENSIONS_ENABLED")
  }
  if (key === "BROWSER_ENABLED") {
    applySetting("PROXY_ENABLED", false)
    applySetting("EXTENSIONS_ENABLED", false)
  }
}

const extensionVersion = usePolled(5000, (stopPolling) => {
  const result = hasExtensionInstalled()
    ? window.__POSTWOMAN_EXTENSION_HOOK__.getVersion()
    : null

  // We don't need to poll anymore after we get value
  if (result) stopPolling()

  return result
})

const interceptors = computed(() => [
  { value: "BROWSER_ENABLED", label: t("state.none") },
  { value: "PROXY_ENABLED", label: t("settings.proxy") },
  {
    value: "EXTENSIONS_ENABLED",
    label:
      `${t("settings.extensions")}: ` +
      (extensionVersion.value !== null
        ? `v${extensionVersion.value.major}.${extensionVersion.value.minor}`
        : t("settings.extension_ver_not_reported")),
  },
])

const interceptorSelection = ref("")

watchEffect(() => {
  if (PROXY_ENABLED.value) {
    interceptorSelection.value = "PROXY_ENABLED"
  } else if (EXTENSIONS_ENABLED.value) {
    interceptorSelection.value = "EXTENSIONS_ENABLED"
  } else {
    interceptorSelection.value = "BROWSER_ENABLED"
  }
})
</script>
