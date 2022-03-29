<template>
  <div>
    <div class="container space-y-8 divide-y divide-dividerLight">
      <div class="md:grid md:gap-4 md:grid-cols-3">
        <div class="p-8 md:col-span-1">
          <h3 class="heading">ttheme</h3>
          <p class="my-1 text-secondaryLight">
            {{ t("settings.theme_description") }}
          </p>
        </div>
        <div class="p-8 space-y-8 md:col-span-2">
          <section class="my-16">
            <h4 class="font-semibold text-secondaryDark">
              {{ t("settings.background") }}
            </h4>
            <div class="my-1 text-secondaryLight">
              <ColorScheme placeholder="..." tag="span">
                {{ t(getColorModeName(colorMode.preference)) }}
                <span v-if="colorMode.preference === 'system'">
                  ({{ t(getColorModeName(colorMode.value)) }})
                </span>
              </ColorScheme>
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
              <SmartLink
                class="link"
                to="https://github.com/hoppscotch/hoppscotch/issues/new/choose"
                blank
              >
                {{ t("app.contact_us") }} </SmartLink
              >.
            </div>
            <div class="py-4 space-y-4">
              <div class="flex items-center">
                <SmartToggle
                  :on="EXPAND_NAVIGATION"
                  @change="toggleSetting('EXPAND_NAVIGATION')"
                >
                  {{ t("settings.expand_navigation") }}
                </SmartToggle>
              </div>
              <div class="flex items-center">
                <SmartToggle
                  :on="SIDEBAR_ON_LEFT"
                  @change="toggleSetting('SIDEBAR_ON_LEFT')"
                >
                  {{ t("settings.sidebar_on_left") }}
                </SmartToggle>
              </div>
              <div class="flex items-center">
                <SmartToggle :on="ZEN_MODE" @change="toggleSetting('ZEN_MODE')">
                  {{ t("layout.zen_mode") }}
                </SmartToggle>
              </div>
            </div>
          </section>
        </div>
      </div>

      <div class="md:grid md:gap-4 md:grid-cols-3">
        <div class="p-8 space-y-8 md:col-span-2">
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
              <SmartLink
                class="link"
                to="https://docs.hoppscotch.io/privacy"
                blank
              >
                {{ t("app.proxy_privacy_policy") }} </SmartLink
              >.
            </div>
            <div class="py-4 space-y-4">
              <div class="flex items-center">
                <SmartToggle
                  :on="PROXY_ENABLED"
                  @change="toggleInterceptor('proxy')"
                >
                  {{ t("settings.proxy_use_toggle") }}
                </SmartToggle>
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
              <ButtonSecondary
                v-tippy="{ theme: 'tooltip' }"
                :title="t('settings.reset_default')"
                :svg="clearIcon"
                outline
                class="rounded"
                @click.native="resetProxy"
              />
            </div>
          </section>
        </div>
      </div>
    </div>
    <SmartConfirmModal
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
import { ref, computed, watch, defineComponent } from "@nuxtjs/composition-api"
import { applySetting, toggleSetting, useSetting } from "~/newstore/settings"
import { useToast, useI18n, useColorMode } from "~/helpers/utils/composables"

const t = useI18n()
const toast = useToast()
const colorMode = useColorMode()

const ACCENT_COLOR = useSetting("THEME_COLOR")
const PROXY_ENABLED = useSetting("PROXY_ENABLED")
const PROXY_URL = useSetting("PROXY_URL")
const EXTENSIONS_ENABLED = useSetting("EXTENSIONS_ENABLED")
const EXPAND_NAVIGATION = useSetting("EXPAND_NAVIGATION")
const SIDEBAR_ON_LEFT = useSetting("SIDEBAR_ON_LEFT")
const ZEN_MODE = useSetting("ZEN_MODE")

const clearIcon = ref("rotate-ccw")

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

const resetProxy = () => {
  applySetting("PROXY_URL", `https://proxy.hoppscotch.io/`)
  clearIcon.value = "check"
  toast.success(`${t("state.cleared")}`)
  setTimeout(() => (clearIcon.value = "rotate-ccw"), 1000)
}

const getColorModeName = (colorMode: string) => {
  return "settings.dark_mode"
  // switch (colorMode) {
  //   case "system":
  //     return "settings.system_mode"
  //   case "light":
  //     return "settings.light_mode"
  //   case "dark":
  //     return "settings.dark_mode"
  //   case "black":
  //     return "settings.black_mode"
  //   default:
  //     return "settings.system_mode"
  // }
}
</script>

<script lang="ts">
export default defineComponent({
  head() {
    return {
      title: `${this.$t("navigation.settings")} • Hoppscotch`,
    }
  },
})
</script>
