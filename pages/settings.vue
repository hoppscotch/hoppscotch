<template>
  <div>
    <div class="divide-y divide-dividerLight space-y-8">
      <div class="md:grid md:grid-cols-3 md:gap-4">
        <div class="p-8 md:col-span-1">
          <h3 class="heading">
            {{ $t("account") }}
          </h3>
          <p class="mt-1 text-xs text-secondaryLight">
            Customize your account settings.
          </p>
        </div>
        <div class="p-8 md:col-span-2">
          <div v-if="currentUser === null">
            <ButtonPrimary label="Log in" @click.native="showLogin = true" />
            <div class="mt-4 text-xs text-secondaryLight">
              Log in to access.
            </div>
          </div>
          <div v-else class="space-y-8">
            <fieldset>
              <legend class="font-bold text-secondaryDark">User</legend>
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
                    <label>
                      {{ currentUser.displayName || $t("nothing_found") }}
                    </label>
                    <p class="mt-1 text-xs text-secondaryLight">
                      This is your display name.
                    </p>
                  </div>
                </div>
                <div class="flex items-start">
                  <div class="flex items-center">
                    <i class="material-icons">email</i>
                  </div>
                  <div class="ml-4">
                    <label>
                      {{ currentUser.email || $t("nothing_found") }}
                    </label>
                    <p class="mt-1 text-xs text-secondaryLight">
                      Your primary email address.
                    </p>
                  </div>
                </div>
              </div>
            </fieldset>
            <fieldset>
              <legend class="font-bold text-secondaryDark">Sync</legend>
              <div class="mt-1 text-xs text-secondaryLight">
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
            </fieldset>
          </div>
        </div>
      </div>

      <div class="md:grid md:grid-cols-3 md:gap-4">
        <div class="p-8 md:col-span-1">
          <h3 class="heading">
            {{ $t("theme") }}
          </h3>
          <p class="mt-1 text-xs text-secondaryLight">
            Customize your application theme.
          </p>
        </div>
        <div class="space-y-8 p-8 md:col-span-2">
          <fieldset>
            <legend class="font-bold text-secondaryDark">
              {{ $t("background") }}
            </legend>
            <div class="mt-1 text-xs text-secondaryLight">
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
          </fieldset>
          <fieldset>
            <legend class="font-bold text-secondaryDark">
              {{ $t("color") }}
            </legend>
            <div class="mt-1 text-xs text-secondaryLight">
              {{ active.charAt(0).toUpperCase() + active.slice(1) }}
            </div>
            <div class="mt-4">
              <SmartAccentModePicker />
            </div>
          </fieldset>
          <fieldset>
            <legend class="font-bold text-secondaryDark">
              {{ $t("experiments") }}
            </legend>
            <div class="mt-1 text-xs text-secondaryLight">
              {{ $t("experiments_notice") }}
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
                  :on="SCROLL_INTO_ENABLED"
                  @change="toggleSetting('SCROLL_INTO_ENABLED')"
                >
                  {{ $t("scrollInto_use_toggle") }}
                </SmartToggle>
              </div>
              <div class="flex items-center">
                <SmartToggle
                  :on="EXPERIMENTAL_URL_BAR_ENABLED"
                  @change="toggleSetting('EXPERIMENTAL_URL_BAR_ENABLED')"
                >
                  {{ $t("use_experimental_url_bar") }}
                </SmartToggle>
              </div>
              <div class="flex items-center">
                <SmartToggle :on="TELEMETRY_ENABLED" @change="showConfirmModal">
                  {{ $t("telemetry") }}
                  {{ TELEMETRY_ENABLED ? $t("enabled") : $t("disabled") }}
                </SmartToggle>
              </div>
            </div>
          </fieldset>
        </div>
      </div>

      <div class="md:grid md:grid-cols-3 md:gap-4">
        <div class="p-8 md:col-span-1">
          <h3 class="heading">
            {{ $t("interceptor") }}
          </h3>
          <p class="mt-1 text-xs text-secondaryLight">
            Middleware between application and APIs.
          </p>
        </div>
        <div class="space-y-8 p-8 md:col-span-2">
          <fieldset>
            <legend class="font-bold text-secondaryDark">
              {{ $t("extensions") }}
            </legend>
            <div class="mt-1 text-xs text-secondaryLight">
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
          </fieldset>
          <fieldset>
            <legend class="font-bold text-secondaryDark">
              {{ $t("proxy") }}
            </legend>
            <div class="mt-1 text-xs text-secondaryLight">
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
              <div class="flex items-center">
                <SmartToggle
                  :on="PROXY_ENABLED"
                  @change="toggleSetting('PROXY_ENABLED')"
                />
                <label
                  for="url"
                  class="
                    bg-primaryLight
                    border border-divider
                    rounded-l
                    ml-2
                    py-1
                    px-2
                  "
                  >{{ $t("url") }}</label
                >
                <input
                  id="url"
                  v-model="PROXY_URL"
                  class="
                    border border-divider
                    rounded-r
                    flex-1
                    mr-2
                    w-full
                    py-1
                    px-2
                    block
                  "
                  type="url"
                  :disabled="!PROXY_ENABLED"
                  :placeholder="$t('url')"
                />
                <ButtonSecondary
                  v-tippy="{ theme: 'tooltip' }"
                  :title="$t('reset_default')"
                  :icon="clearIcon"
                  @click.native="resetProxy"
                />
              </div>
            </div>
          </fieldset>
        </div>
      </div>
    </div>
    <FirebaseLogin :show="showLogin" @hide-modal="showLogin = false" />
    <SmartConfirmModal
      :show="confirmRemove"
      :title="`${$t('are_you_sure_remove_telemetry')} ${$t(
        'telemetry_helps_us'
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
import Vue from "vue"
import { hasExtensionInstalled } from "../helpers/strategies/ExtensionStrategy"
import {
  getSettingSubject,
  applySetting,
  toggleSetting,
  defaultSettings,
} from "~/newstore/settings"
import type { KeysMatching } from "~/types/ts-utils"
import { currentUser$ } from "~/helpers/fb/auth"
import { getLocalConfig } from "~/newstore/localpersistence"

type SettingsType = typeof defaultSettings

export default Vue.extend({
  data() {
    return {
      extensionVersion: hasExtensionInstalled()
        ? window.__POSTWOMAN_EXTENSION_HOOK__.getVersion()
        : null,

      clearIcon: "clear_all",

      SYNC_COLLECTIONS: true,
      SYNC_ENVIRONMENTS: true,
      SYNC_HISTORY: true,

      PROXY_URL: "",
      PROXY_KEY: "",

      EXTENSIONS_ENABLED: true,
      PROXY_ENABLED: true,

      currentUser: null,

      showLogin: false,

      active: getLocalConfig("THEME_COLOR") || "green",
      confirmRemove: false,

      TELEMETRY_ENABLED: null,
    }
  },
  subscriptions() {
    return {
      SCROLL_INTO_ENABLED: getSettingSubject("SCROLL_INTO_ENABLED"),

      PROXY_ENABLED: getSettingSubject("PROXY_ENABLED"),
      PROXY_URL: getSettingSubject("PROXY_URL"),
      PROXY_KEY: getSettingSubject("PROXY_KEY"),

      EXTENSIONS_ENABLED: getSettingSubject("EXTENSIONS_ENABLED"),

      EXPERIMENTAL_URL_BAR_ENABLED: getSettingSubject(
        "EXPERIMENTAL_URL_BAR_ENABLED"
      ),

      SYNC_COLLECTIONS: getSettingSubject("syncCollections"),
      SYNC_ENVIRONMENTS: getSettingSubject("syncEnvironments"),
      SYNC_HISTORY: getSettingSubject("syncHistory"),

      TELEMETRY_ENABLED: getSettingSubject("TELEMETRY_ENABLED"),

      currentUser: currentUser$,
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
      this.$toast.info(this.$t("cleared"), {
        icon: "clear_all",
      })
      setTimeout(() => (this.clearIcon = "clear_all"), 1000)
    },
  },
})
</script>
