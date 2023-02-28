<template>
  <div>
    <div class="container space-y-8 divide-y divide-dividerLight">
      <div class="md:grid md:gap-4 md:grid-cols-3">
        <div class="p-8 md:col-span-1">
          <h3 class="heading">
            {{ t("settings.theme") }}
          </h3>
          <p class="my-1 text-secondaryLight">
            {{ t("settings.theme_description") }}
          </p>
        </div>
        <div class="p-8 space-y-8 md:col-span-2">
          <section>
            <h4 class="font-semibold text-secondaryDark">
              {{ t("settings.background") }}
            </h4>
            <div class="my-1 text-secondaryLight">
              {{ t(getColorModeName(colorMode.preference)) }}
              <span v-if="colorMode.preference === 'system'">
                ({{ t(getColorModeName(colorMode.value)) }})
              </span>
            </div>
            <div class="mt-4">
              <SmartColorModePicker />
            </div>
          </section>
          <section>
            <h4 class="font-semibold text-secondaryDark">
              {{ t("settings.accent_color") }}
            </h4>
            <div class="my-1 text-secondaryLight">
              {{ ACCENT_COLOR.charAt(0).toUpperCase() + ACCENT_COLOR.slice(1) }}
            </div>
            <div class="mt-4">
              <SmartAccentModePicker />
            </div>
          </section>
          <section>
            <h4 class="font-semibold text-secondaryDark">
              {{ t("settings.font_size") }}
            </h4>
            <div class="mt-4">
              <SmartFontSizePicker />
            </div>
          </section>
          <section>
            <h4 class="font-semibold text-secondaryDark">
              {{ t("settings.language") }}
            </h4>
            <div class="mt-4">
              <SmartChangeLanguage />
            </div>
          </section>
          <section>
            <h4 class="font-semibold text-secondaryDark">
              {{ t("settings.experiments") }}
            </h4>
            <div class="my-1 text-secondaryLight">
              {{ t("settings.experiments_notice") }}
              <HoppSmartAnchor
                class="link"
                to="https://github.com/hoppscotch/hoppscotch/issues/new/choose"
                blank
                :label="t('app.contact_us')"
              />.
            </div>
            <div class="py-4 space-y-4">
              <div class="flex items-center">
                <HoppSmartToggle
                  :on="TELEMETRY_ENABLED"
                  @change="showConfirmModal"
                >
                  {{ t("settings.telemetry") }}
                </HoppSmartToggle>
              </div>
              <div class="flex items-center">
                <HoppSmartToggle
                  :on="EXPAND_NAVIGATION"
                  @change="toggleSetting('EXPAND_NAVIGATION')"
                >
                  {{ t("settings.expand_navigation") }}
                </HoppSmartToggle>
              </div>
              <div class="flex items-center">
                <HoppSmartToggle
                  :on="SIDEBAR_ON_LEFT"
                  @change="toggleSetting('SIDEBAR_ON_LEFT')"
                >
                  {{ t("settings.sidebar_on_left") }}
                </HoppSmartToggle>
              </div>
              <div class="flex items-center">
                <HoppSmartToggle
                  :on="ZEN_MODE"
                  @change="toggleSetting('ZEN_MODE')"
                >
                  {{ t("layout.zen_mode") }}
                </HoppSmartToggle>
              </div>
            </div>
          </section>
        </div>
      </div>

      <div class="md:grid md:gap-4 md:grid-cols-3">
        <div class="p-8 md:col-span-1">
          <h3 class="heading">
            {{ t("settings.interceptor") }}
          </h3>
          <p class="my-1 text-secondaryLight">
            {{ t("settings.interceptor_description") }}
          </p>
        </div>
        <div class="p-8 space-y-8 md:col-span-2">
          <section>
            <h4 class="font-semibold text-secondaryDark">
              {{ t("settings.extensions") }}
            </h4>
            <div class="my-1 text-secondaryLight">
              <span v-if="extensionVersion != null">
                {{
                  `${t("settings.extension_version")}: v${
                    extensionVersion.major
                  }.${extensionVersion.minor}`
                }}
              </span>
              <span v-else>
                {{ t("settings.extension_version") }}:
                {{ t("settings.extension_ver_not_reported") }}
              </span>
            </div>
            <div class="flex flex-col py-4 space-y-2">
              <span>
                <HoppSmartItem
                  to="https://chrome.google.com/webstore/detail/hoppscotch-browser-extens/amknoiejhlmhancpahfcfcfhllgkpbld"
                  blank
                  :icon="IconChrome"
                  label="Chrome"
                  :info-icon="hasChromeExtInstalled ? IconCheckCircle : null"
                  :active-info-icon="hasChromeExtInstalled"
                  outline
                />
              </span>
              <span>
                <HoppSmartItem
                  to="https://addons.mozilla.org/en-US/firefox/addon/hoppscotch"
                  blank
                  :icon="IconFirefox"
                  label="Firefox"
                  :info-icon="hasFirefoxExtInstalled ? IconCheckCircle : null"
                  :active-info-icon="hasFirefoxExtInstalled"
                  outline
                />
              </span>
            </div>
            <div class="py-4 space-y-4">
              <div class="flex items-center">
                <HoppSmartToggle
                  :on="EXTENSIONS_ENABLED"
                  @change="toggleInterceptor('extension')"
                >
                  {{ t("settings.extensions_use_toggle") }}
                </HoppSmartToggle>
              </div>
            </div>
          </section>
          <section>
            <h4 class="font-semibold text-secondaryDark">
              {{ t("settings.proxy") }}
            </h4>
            <div class="my-1 text-secondaryLight">
              {{
                `${t("settings.official_proxy_hosting")} ${t(
                  "settings.read_the"
                )}`
              }}
              <HoppSmartAnchor
                class="link"
                to="https://docs.hoppscotch.io/privacy"
                blank
                :label="t('app.proxy_privacy_policy')"
              />.
            </div>
            <div class="py-4 space-y-4">
              <div class="flex items-center">
                <HoppSmartToggle
                  :on="PROXY_ENABLED"
                  @change="toggleInterceptor('proxy')"
                >
                  {{ t("settings.proxy_use_toggle") }}
                </HoppSmartToggle>
              </div>
            </div>
            <div class="flex items-center py-4 space-x-2">
              <div class="relative flex flex-col flex-1">
                <input
                  id="url"
                  v-model="PROXY_URL"
                  class="input floating-input"
                  placeholder=" "
                  type="url"
                  autocomplete="off"
                  :disabled="!PROXY_ENABLED"
                />
                <label for="url">
                  {{ t("settings.proxy_url") }}
                </label>
              </div>
              <HoppButtonSecondary
                v-tippy="{ theme: 'tooltip' }"
                :title="t('settings.reset_default')"
                :icon="clearIcon"
                outline
                class="rounded"
                @click="resetProxy"
              />
            </div>
          </section>
        </div>
      </div>
    </div>
    <HoppSmartConfirmModal
      :show="confirmRemove"
      :title="`${t('confirm.remove_telemetry')} ${t(
        'settings.telemetry_helps_us'
      )}`"
      @hide-modal="confirmRemove = false"
      @resolve="
        () => {
          toggleSetting('TELEMETRY_ENABLED')
          confirmRemove = false
        }
      "
    />
  </div>
</template>

<script setup lang="ts">
import IconChrome from "~icons/brands/chrome"
import IconCheckCircle from "~icons/lucide/check-circle"
import IconFirefox from "~icons/brands/firefox"
import IconRotateCCW from "~icons/lucide/rotate-ccw"
import IconCheck from "~icons/lucide/check"
import { ref, computed, watch } from "vue"
import { refAutoReset } from "@vueuse/core"
import { applySetting, toggleSetting } from "~/newstore/settings"
import { useSetting } from "@composables/settings"
import { useToast } from "@composables/toast"
import { useI18n } from "@composables/i18n"
import { useColorMode } from "@composables/theming"
import { useReadonlyStream } from "@composables/stream"

import { browserIsChrome, browserIsFirefox } from "~/helpers/utils/userAgent"
import { extensionStatus$ } from "~/newstore/HoppExtension"
import { usePageHead } from "@composables/head"

const t = useI18n()
const toast = useToast()
const colorMode = useColorMode()

usePageHead({
  title: computed(() => t("navigation.settings")),
})

const ACCENT_COLOR = useSetting("THEME_COLOR")
const PROXY_ENABLED = useSetting("PROXY_ENABLED")
const PROXY_URL = useSetting("PROXY_URL")
const EXTENSIONS_ENABLED = useSetting("EXTENSIONS_ENABLED")
const TELEMETRY_ENABLED = useSetting("TELEMETRY_ENABLED")
const EXPAND_NAVIGATION = useSetting("EXPAND_NAVIGATION")
const SIDEBAR_ON_LEFT = useSetting("SIDEBAR_ON_LEFT")
const ZEN_MODE = useSetting("ZEN_MODE")

const currentExtensionStatus = useReadonlyStream(extensionStatus$, null)

const extensionVersion = computed(() => {
  return currentExtensionStatus.value === "available"
    ? window.__POSTWOMAN_EXTENSION_HOOK__?.getVersion() ?? null
    : null
})

const hasChromeExtInstalled = computed(
  () => browserIsChrome() && currentExtensionStatus.value === "available"
)

const hasFirefoxExtInstalled = computed(
  () => browserIsFirefox() && currentExtensionStatus.value === "available"
)

const clearIcon = refAutoReset<typeof IconRotateCCW | typeof IconCheck>(
  IconRotateCCW,
  1000
)

const confirmRemove = ref(false)

const proxySettings = computed(() => ({
  url: PROXY_URL.value,
}))

watch(ZEN_MODE, (mode) => {
  applySetting("EXPAND_NAVIGATION", !mode)
})

watch(
  proxySettings,
  ({ url }) => {
    applySetting("PROXY_URL", url)
  },
  { deep: true }
)

// Extensions and proxy should not be enabled at the same time
const toggleInterceptor = (interceptor: "extension" | "proxy") => {
  if (interceptor === "extension") {
    EXTENSIONS_ENABLED.value = !EXTENSIONS_ENABLED.value

    if (EXTENSIONS_ENABLED.value) {
      PROXY_ENABLED.value = false
    }
  } else {
    PROXY_ENABLED.value = !PROXY_ENABLED.value

    if (PROXY_ENABLED.value) {
      EXTENSIONS_ENABLED.value = false
    }
  }
}

const showConfirmModal = () => {
  if (TELEMETRY_ENABLED.value) confirmRemove.value = true
  else toggleSetting("TELEMETRY_ENABLED")
}

const resetProxy = () => {
  applySetting("PROXY_URL", `https://proxy.hoppscotch.io/`)
  clearIcon.value = IconCheck
  toast.success(`${t("state.cleared")}`)
}

const getColorModeName = (colorMode: string) => {
  switch (colorMode) {
    case "system":
      return "settings.system_mode"
    case "light":
      return "settings.light_mode"
    case "dark":
      return "settings.dark_mode"
    case "black":
      return "settings.black_mode"
    default:
      return "settings.system_mode"
  }
}
</script>
