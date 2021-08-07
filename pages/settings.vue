<template>
  <div>
    <div class="divide-y divide-dividerLight space-y-8">
      <div class="md:grid md:gap-4 md:grid-cols-3">
        <div class="p-8 md:col-span-1">
          <h3 class="heading">
            {{ $t("account") }}
          </h3>
          <p class="mt-1 text-secondaryLight">
            Customize your account settings.
          </p>
        </div>
        <div class="p-8 md:col-span-2">
          <div v-if="currentUser === null">
            <ButtonPrimary label="Log in" @click.native="showLogin = true" />
            <div class="mt-4 text-secondaryLight">Log in to access.</div>
          </div>
          <div v-else class="space-y-8">
            <section>
              <h4 class="font-bold text-secondaryDark">User</h4>
              <div class="space-y-4 mt-4">
                <div class="flex items-start">
                  <div class="flex items-center">
                    <img
                      v-if="currentUser.photoURL"
                      :src="currentUser.photoURL"
                      class="rounded-full h-5 w-5"
                    />
                    <i v-else class="material-icons">account_circle</i>
                  </div>
                  <div class="ml-4">
                    <label class="font-semibold">
                      {{ currentUser.displayName || $t("nothing_found") }}
                    </label>
                    <p class="mt-1 text-secondaryLight">
                      This is your display name.
                    </p>
                  </div>
                </div>
                <div class="flex items-start">
                  <div class="flex items-center">
                    <i class="material-icons">email</i>
                  </div>
                  <div class="ml-4">
                    <label class="font-semibold">
                      {{ currentUser.email || $t("nothing_found") }}
                    </label>
                    <p class="mt-1 text-secondaryLight">
                      Your primary email address.
                    </p>
                  </div>
                </div>
              </div>
            </section>
            <Teams v-if="currentBackendUser && currentBackendUser.eaInvited" />
            <section>
              <h4 class="font-bold text-secondaryDark">Sync</h4>
              <div class="mt-1 text-secondaryLight">
                These settings are synced to cloud.
              </div>
              <div class="space-y-4 mt-4">
                <div class="flex items-center">
                  <SmartToggle
                    :on="SYNC_COLLECTIONS"
                    @change="
                      toggleSettings('syncCollections', !SYNC_COLLECTIONS)
                    "
                  >
                    {{ $t("syncCollections") }}
                  </SmartToggle>
                </div>
                <div class="flex items-center">
                  <SmartToggle
                    :on="SYNC_ENVIRONMENTS"
                    @change="
                      toggleSettings('syncEnvironments', !SYNC_ENVIRONMENTS)
                    "
                  >
                    {{ $t("syncEnvironments") }}
                  </SmartToggle>
                </div>
                <div class="flex items-center">
                  <SmartToggle
                    :on="SYNC_HISTORY"
                    @change="toggleSettings('syncHistory', !SYNC_HISTORY)"
                  >
                    {{ $t("syncHistory") }}
                  </SmartToggle>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>

      <div class="md:grid md:gap-4 md:grid-cols-3">
        <div class="p-8 md:col-span-1">
          <h3 class="heading">
            {{ $t("theme") }}
          </h3>
          <p class="mt-1 text-secondaryLight">
            Customize your application theme.
          </p>
        </div>
        <div class="space-y-8 p-8 md:col-span-2">
          <section>
            <h4 class="font-bold text-secondaryDark">
              {{ $t("background") }}
            </h4>
            <div class="mt-1 text-secondaryLight">
              <ColorScheme placeholder="..." tag="span">
                {{
                  $colorMode.preference.charAt(0).toUpperCase() +
                  $colorMode.preference.slice(1)
                }}
                <span v-if="$colorMode.preference === 'system'">
                  ({{ $colorMode.value }} mode detected)
                </span>
              </ColorScheme>
            </div>
            <div class="mt-4">
              <SmartColorModePicker />
            </div>
          </section>
          <section>
            <h4 class="font-bold text-secondaryDark">
              {{ $t("settings.accent_color") }}
            </h4>
            <div class="mt-1 text-secondaryLight">
              {{ active.charAt(0).toUpperCase() + active.slice(1) }}
            </div>
            <div class="mt-4">
              <SmartAccentModePicker />
            </div>
          </section>
          <section>
            <h4 class="font-bold text-secondaryDark">
              {{ $t("settings.font_size") }}
            </h4>
            <div class="mt-4">
              <SmartFontSizePicker />
            </div>
          </section>
          <section>
            <h4 class="font-bold text-secondaryDark">
              {{ $t("settings.language") }}
            </h4>
            <div class="mt-4">
              <SmartChangeLanguage />
            </div>
          </section>
          <section>
            <h4 class="font-bold text-secondaryDark">
              {{ $t("settings.experiments") }}
            </h4>
            <div class="mt-1 text-secondaryLight">
              {{ $t("settings.experiments_notice") }}
              <SmartLink
                class="link"
                to="https://github.com/hoppscotch/hoppscotch/issues/new/choose"
                blank
              >
                {{ $t("contact_us") }} </SmartLink
              >.
            </div>
            <div class="space-y-4 mt-4">
              <div class="flex items-center">
                <SmartToggle
                  :on="EXPERIMENTAL_URL_BAR_ENABLED"
                  @change="toggleSetting('EXPERIMENTAL_URL_BAR_ENABLED')"
                >
                  {{ $t("settings.use_experimental_url_bar") }}
                </SmartToggle>
              </div>
              <div class="flex items-center">
                <SmartToggle :on="TELEMETRY_ENABLED" @change="showConfirmModal">
                  {{ $t("settings.telemetry") }}
                  {{ TELEMETRY_ENABLED ? $t("enabled") : $t("disabled") }}
                </SmartToggle>
              </div>
              <div class="flex items-center">
                <SmartToggle
                  :on="SHORTCUT_INDICATOR"
                  @change="toggleSetting('SHORTCUT_INDICATOR')"
                >
                  {{ $t("settings.shortcuts_indicator") }}
                  {{ SHORTCUT_INDICATOR ? $t("enabled") : $t("disabled") }}
                </SmartToggle>
              </div>
              <div class="flex items-center">
                <SmartToggle
                  :on="LEFT_SIDEBAR"
                  @change="toggleSetting('LEFT_SIDEBAR')"
                >
                  {{ $t("settings.navigation_sidebar") }}
                  {{ LEFT_SIDEBAR ? $t("enabled") : $t("disabled") }}
                </SmartToggle>
              </div>
              <div class="flex items-center">
                <SmartToggle :on="ZEN_MODE" @change="toggleSetting('ZEN_MODE')">
                  {{ $t("layout.zen_mode") }}
                  {{ ZEN_MODE ? $t("enabled") : $t("disabled") }}
                </SmartToggle>
              </div>
            </div>
          </section>
        </div>
      </div>

      <div class="md:grid md:gap-4 md:grid-cols-3">
        <div class="p-8 md:col-span-1">
          <h3 class="heading">
            {{ $t("settings.interceptor") }}
          </h3>
          <p class="mt-1 text-secondaryLight">
            Middleware between application and APIs.
          </p>
        </div>
        <div class="space-y-8 p-8 md:col-span-2">
          <section>
            <h4 class="font-bold text-secondaryDark">
              {{ $t("extensions") }}
            </h4>
            <div class="mt-1 text-secondaryLight">
              <span v-if="extensionVersion != null">
                {{
                  `${$t("extension_version")}: v${extensionVersion.major}.${
                    extensionVersion.minor
                  }`
                }}
              </span>
              <span v-else>
                {{ $t("extension_version") }}:
                {{ $t("extension_ver_not_reported") }}
              </span>
            </div>
            <div class="flex flex-col space-y-2 py-4">
              <span>
                <SmartItem
                  to="https://addons.mozilla.org/en-US/firefox/addon/hoppscotch"
                  blank
                  svg="firefox"
                  label="Firefox"
                  :info-icon="hasFirefoxExtInstalled ? 'check_circle' : ''"
                  outline
                />
              </span>
              <span>
                <SmartItem
                  to="https://chrome.google.com/webstore/detail/hoppscotch-browser-extens/amknoiejhlmhancpahfcfcfhllgkpbld"
                  blank
                  svg="chrome"
                  label="Chrome"
                  :info-icon="hasChromeExtInstalled ? 'check_circle' : ''"
                  outline
                />
              </span>
            </div>
            <div class="space-y-4 mt-4">
              <div class="flex items-center">
                <SmartToggle
                  :on="EXTENSIONS_ENABLED"
                  @change="toggleSetting('EXTENSIONS_ENABLED')"
                >
                  {{ $t("extensions_use_toggle") }}
                </SmartToggle>
              </div>
            </div>
          </section>
          <section>
            <h4 class="font-bold text-secondaryDark">
              {{ $t("proxy") }}
            </h4>
            <div class="mt-1 text-secondaryLight">
              {{ `${$t("official_proxy_hosting")} ${$t("read_the")}` }}
              <SmartLink
                class="link"
                to="https://github.com/hoppscotch/proxyscotch/wiki/Privacy-policy"
                blank
              >
                {{ $t("proxy_privacy_policy") }} </SmartLink
              >.
            </div>
            <div class="space-y-4 mt-4">
              <div class="flex space-x-2 items-center">
                <SmartToggle
                  :on="PROXY_ENABLED"
                  @change="toggleSetting('PROXY_ENABLED')"
                />
                <div class="flex flex-1 items-center relative">
                  <input
                    id="url"
                    v-model="PROXY_URL"
                    class="input floating-input"
                    placeholder=" "
                    type="url"
                    :disabled="!PROXY_ENABLED"
                  />
                  <label for="url">
                    {{ `${$t("proxy")} ${$t("url")}` }}
                  </label>
                </div>
                <ButtonSecondary
                  v-tippy="{ theme: 'tooltip' }"
                  :title="$t('reset_default')"
                  :icon="clearIcon"
                  outline
                  @click.native="resetProxy"
                />
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
    <FirebaseLogin :show="showLogin" @hide-modal="showLogin = false" />
    <SmartConfirmModal
      :show="confirmRemove"
      :title="`${$t('confirm.remove_telemetry')} ${$t(
        'settings.telemetry_helps_us'
      )}`"
      @hide-modal="confirmRemove = false"
      @resolve="
        toggleSetting('TELEMETRY_ENABLED')
        confirmRemove = false
      "
    />
  </div>
</template>

<script lang="ts">
import { defineComponent } from "@nuxtjs/composition-api"
import { currentUserInfo$ } from "~/helpers/teams/BackendUserInfo"
import {
  hasExtensionInstalled,
  hasChromeExtensionInstalled,
  hasFirefoxExtensionInstalled,
} from "~/helpers/strategies/ExtensionStrategy"
import {
  applySetting,
  toggleSetting,
  defaultSettings,
  useSetting,
} from "~/newstore/settings"
import type { KeysMatching } from "~/types/ts-utils"
import { currentUser$ } from "~/helpers/fb/auth"
import { getLocalConfig } from "~/newstore/localpersistence"
import { useReadonlyStream } from "~/helpers/utils/composables"

type SettingsType = typeof defaultSettings

export default defineComponent({
  setup() {
    return {
      PROXY_ENABLED: useSetting("PROXY_ENABLED"),
      PROXY_URL: useSetting("PROXY_URL"),
      PROXY_KEY: useSetting("PROXY_KEY"),
      EXTENSIONS_ENABLED: useSetting("EXTENSIONS_ENABLED"),
      EXPERIMENTAL_URL_BAR_ENABLED: useSetting("EXPERIMENTAL_URL_BAR_ENABLED"),
      SYNC_COLLECTIONS: useSetting("syncCollections"),
      SYNC_ENVIRONMENTS: useSetting("syncEnvironments"),
      SYNC_HISTORY: useSetting("syncHistory"),
      TELEMETRY_ENABLED: useSetting("TELEMETRY_ENABLED"),
      SHORTCUT_INDICATOR: useSetting("SHORTCUT_INDICATOR"),
      LEFT_SIDEBAR: useSetting("LEFT_SIDEBAR"),
      ZEN_MODE: useSetting("ZEN_MODE"),
      currentUser: useReadonlyStream(currentUser$, currentUser$.value),
      currentBackendUser: useReadonlyStream(
        currentUserInfo$,
        currentUserInfo$.value
      ),
    }
  },
  data() {
    return {
      extensionVersion: hasExtensionInstalled()
        ? window.__POSTWOMAN_EXTENSION_HOOK__.getVersion()
        : null,

      hasChromeExtInstalled: hasChromeExtensionInstalled(),
      hasFirefoxExtInstalled: hasFirefoxExtensionInstalled(),

      clearIcon: "clear_all",

      showLogin: false,

      active: getLocalConfig("THEME_COLOR") || "blue",
      confirmRemove: false,
    }
  },
  head() {
    return {
      title: `Settings • Hoppscotch`,
    }
  },
  computed: {
    proxySettings(): { url: string; key: string } {
      return {
        url: this.PROXY_URL,
        key: this.PROXY_KEY,
      }
    },
  },
  watch: {
    ZEN_MODE(ZEN_MODE) {
      this.applySetting("LEFT_SIDEBAR", !ZEN_MODE)
      // this.applySetting("RIGHT_SIDEBAR", !ZEN_MODE)
    },
    proxySettings: {
      deep: true,
      handler({ url, key }) {
        this.applySetting("PROXY_URL", url)
        this.applySetting("PROXY_KEY", key)
      },
    },
  },
  methods: {
    showConfirmModal() {
      if (this.TELEMETRY_ENABLED) this.confirmRemove = true
      else toggleSetting("TELEMETRY_ENABLED")
    },
    applySetting<K extends keyof SettingsType>(key: K, value: SettingsType[K]) {
      applySetting(key, value)
    },
    toggleSetting<K extends KeysMatching<SettingsType, boolean>>(key: K) {
      if (key === "EXTENSIONS_ENABLED" && this.PROXY_ENABLED) {
        toggleSetting("PROXY_ENABLED")
      }
      if (key === "PROXY_ENABLED" && this.EXTENSIONS_ENABLED) {
        toggleSetting("EXTENSIONS_ENABLED")
      }
      toggleSetting(key)
    },
    toggleSettings<K extends KeysMatching<SettingsType, boolean>>(
      name: K,
      value: SettingsType[K]
    ) {
      this.applySetting(name, value)
    },
    resetProxy() {
      applySetting("PROXY_URL", `https://proxy.hoppscotch.io/`)
      this.clearIcon = "done"
      this.$toast.info(this.$t("cleared").toString(), {
        icon: "clear_all",
      })
      setTimeout(() => (this.clearIcon = "clear_all"), 1000)
    },
  },
})
</script>
