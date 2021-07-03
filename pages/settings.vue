<template>
  <div class="page">
    <div v-if="currentBackendUser && currentBackendUser.eaInvited">
      <Teams />
    </div>

    <AppSection label="account">
      <div class="flex flex-col">
        <label>{{ $t("account") }}</label>
        <div v-if="currentUser">
          <ButtonSecondary />
          <img
            v-if="currentUser.photoURL"
            :src="currentUser.photoURL"
            class="w-6 h-6 rounded-full material-icons"
          />
          <i v-else class="material-icons">account_circle</i>
          <span>
            {{ currentUser.displayName || $t("nothing_found") }}
          </span>

          <br />
          <ButtonSecondary />
          <i class="material-icons">email</i>
          <span>
            {{ currentUser.email || $t("nothing_found") }}
          </span>

          <br />
          <FirebaseLogout />
          <p>
            <SmartToggle
              :on="SYNC_COLLECTIONS"
              @change="toggleSettings('syncCollections', !SYNC_COLLECTIONS)"
            >
              {{ $t("syncCollections") + " " + $t("sync") }}
              {{ SYNC_COLLECTIONS ? $t("enabled") : $t("disabled") }}
            </SmartToggle>
          </p>

          <p>
            <SmartToggle
              :on="SYNC_ENVIRONMENTS"
              @change="toggleSettings('syncEnvironments', !SYNC_ENVIRONMENTS)"
            >
              {{ $t("syncEnvironments") + " " + $t("sync") }}
              {{ SYNC_ENVIRONMENTS ? $t("enabled") : $t("disabled") }}
            </SmartToggle>
          </p>

          <p>
            <SmartToggle
              :on="SYNC_HISTORY"
              @change="toggleSettings('syncHistory', !SYNC_HISTORY)"
            >
              {{ $t("syncHistory") + " " + $t("sync") }}
              {{ SYNC_HISTORY ? $t("enabled") : $t("disabled") }}
            </SmartToggle>
          </p>
        </div>
        <div v-else>
          <label>{{ $t("login_with") }}</label>
          <p>
            <FirebaseLogin @show-email="showEmail = true" />
          </p>
        </div>
      </div>
    </AppSection>

    <AppSection label="theme">
      <div class="flex flex-col">
        <label>{{ $t("theme") }}</label>
        <SmartColorModePicker />
        <SmartAccentModePicker />
        <span>
          <SmartToggle
            :on="SCROLL_INTO_ENABLED"
            @change="toggleSetting('SCROLL_INTO_ENABLED')"
          >
            {{ $t("scrollInto_use_toggle") }}
            {{ SCROLL_INTO_ENABLED ? $t("enabled") : $t("disabled") }}
          </SmartToggle>
        </span>
      </div>
    </AppSection>

    <AppSection label="extensions">
      <div class="flex flex-col">
        <label>{{ $t("extensions") }}</label>
        <div class="row-wrapper">
          <SmartToggle
            :on="EXTENSIONS_ENABLED"
            @change="toggleSetting('EXTENSIONS_ENABLED')"
          >
            {{ $t("extensions_use_toggle") }}
          </SmartToggle>
        </div>
        <p v-if="extensionVersion != null" class="info">
          {{ $t("extension_version") }}: v{{ extensionVersion.major }}.{{
            extensionVersion.minor
          }}
        </p>
        <p v-else class="info">
          {{ $t("extension_version") }}: {{ $t("extension_ver_not_reported") }}
        </p>
      </div>
    </AppSection>

    <AppSection label="proxy">
      <div class="flex flex-col">
        <label>{{ $t("proxy") }}</label>
        <div class="row-wrapper">
          <span>
            <SmartToggle
              :on="PROXY_ENABLED"
              @change="toggleSetting('PROXY_ENABLED')"
            >
              {{ $t("proxy") }}
              {{ PROXY_ENABLED ? $t("enabled") : $t("disabled") }}
            </SmartToggle>
          </span>
          <ButtonSecondary
            v-tippy="{ theme: 'tooltip' }"
            to="https://github.com/hoppscotch/hoppscotch/wiki/Proxy"
            blank
            :title="$t('wiki')"
            icon="help_outline"
          />
        </div>
        <div class="row-wrapper">
          <label for="url">{{ $t("url") }}</label>
          <ButtonSecondary
            v-tippy="{ theme: 'tooltip' }"
            :title="$t('reset_default')"
            icon="clearIcon"
            @click.native="resetProxy"
          />
        </div>
        <input
          id="url"
          v-model="PROXY_URL"
          class="input"
          type="url"
          :disabled="!PROXY_ENABLED"
          :placeholder="$t('url')"
        />
        <p class="info">
          {{ $t("official_proxy_hosting") }}
          <br />
          {{ $t("read_the") }}
          <SmartLink
            class="link"
            to="https://github.com/hoppscotch/proxyscotch/wiki/Privacy-policy"
            blank
          >
            {{ $t("proxy_privacy_policy") }}
          </SmartLink>
          .
        </p>
      </div>
      <!--
      PROXY SETTINGS URL AND KEY
      --------------
		  This feature is currently not finished.
			<ul>
				<li>
					<label for="url">URL</label>
					<input class="input" id="url" type="url" v-model="settings.PROXY_URL" :disabled="!settings.PROXY_ENABLED">
				</li>
				<li>
					<label for="key">Key</label>
					<input class="input" id="key" type="password" v-model="settings.PROXY_KEY" :disabled="!settings.PROXY_ENABLED" @change="applySetting('PROXY_KEY', $event)">
				</li>
			</ul>
      -->
    </AppSection>

    <AppSection label="experiments">
      <div class="flex flex-col">
        <label>{{ $t("experiments") }}</label>
        <p class="info">
          {{ $t("experiments_notice") }}
          <SmartLink
            class="link"
            to="https://github.com/hoppscotch/hoppscotch/issues/new/choose"
            blank
          >
            {{ $t("contact_us") }}
          </SmartLink>
          .
        </p>
        <div class="row-wrapper">
          <SmartToggle
            :on="EXPERIMENTAL_URL_BAR_ENABLED"
            @change="toggleSetting('EXPERIMENTAL_URL_BAR_ENABLED')"
          >
            {{ $t("use_experimental_url_bar") }}
          </SmartToggle>
        </div>
      </div>
    </AppSection>
    <FirebaseEmail :show="showEmail" @hide-modal="showEmail = false" />
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
import { currentUserInfo$ } from "~/helpers/teams/BackendUserInfo"
import { currentUser$ } from "~/helpers/fb/auth"

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

      showEmail: false,

      currentBackendUser: null,
      currentUser: null,
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

      // Teams feature flag
      currentBackendUser: currentUserInfo$,
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
