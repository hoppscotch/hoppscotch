<template>
  <div class="page">
    <div v-if="currentBackendUser && currentBackendUser.eaInvited">
      <Teams />
    </div>

    <AppSection ref="account" :label="$t('account')" no-legend>
      <div class="flex flex-col">
        <label>{{ $t("account") }}</label>
        <div v-if="currentUser">
          <button class="icon">
            <img
              v-if="currentUser.photoURL"
              :src="currentUser.photoURL"
              class="w-6 h-6 rounded-full material-icons"
            />
            <i v-else class="material-icons">account_circle</i>
            <span>
              {{ currentUser.displayName || $t("nothing_found") }}
            </span>
          </button>
          <br />
          <button class="icon">
            <i class="material-icons">email</i>
            <span>
              {{ currentUser.email || $t("nothing_found") }}
            </span>
          </button>
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

          <p v-if="isSyncDisabled">
            <button @click="initSettings">
              <i class="material-icons">sync</i>
              <span>{{ $t("turn_on") + " " + $t("sync") }}</span>
            </button>
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

    <AppSection ref="theme" :label="$t('theme')" no-legend>
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

    <AppSection ref="extensions" :label="$t('extensions')" no-legend>
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

    <AppSection ref="proxy" :label="$t('proxy')" no-legend>
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
          <a
            href="https://github.com/hoppscotch/hoppscotch/wiki/Proxy"
            target="_blank"
            rel="noopener"
          >
            <button v-tooltip="$t('wiki')" class="icon">
              <i class="material-icons">help_outline</i>
            </button>
          </a>
        </div>
        <div class="row-wrapper">
          <label for="url">{{ $t("url") }}</label>
          <button
            v-tooltip.bottom="$t('reset_default')"
            class="icon"
            @click="resetProxy"
          >
            <i class="material-icons">clear_all</i>
          </button>
        </div>
        <input
          id="url"
          v-model="PROXY_URL"
          type="url"
          :disabled="!PROXY_ENABLED"
          :placeholder="$t('url')"
        />
        <p class="info">
          {{ $t("official_proxy_hosting") }}
          <br />
          {{ $t("read_the") }}
          <a
            class="link"
            href="https://github.com/hoppscotch/proxyscotch/wiki/Privacy-policy"
            target="_blank"
            rel="noopener"
          >
            {{ $t("proxy_privacy_policy") }} </a
          >.
        </p>
      </div>
      <!--
      PROXY SETTINGS URL AND KEY
      --------------
		  This feature is currently not finished.
			<ul>
				<li>
					<label for="url">URL</label>
					<input id="url" type="url" v-model="settings.PROXY_URL" :disabled="!settings.PROXY_ENABLED">
				</li>
				<li>
					<label for="key">Key</label>
					<input id="key" type="password" v-model="settings.PROXY_KEY" :disabled="!settings.PROXY_ENABLED" @change="applySetting('PROXY_KEY', $event)">
				</li>
			</ul>
      -->
    </AppSection>

    <AppSection ref="experiments" :label="$t('experiments')" no-legend>
      <div class="flex flex-col">
        <label>{{ $t("experiments") }}</label>
        <p class="info">
          {{ $t("experiments_notice") }}
          <a
            class="link"
            href="https://github.com/hoppscotch/hoppscotch/issues/new/choose"
            target="_blank"
            rel="noopener noreferrer"
            >{{ $t("contact_us") }}</a
          >.
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

      doneButton: '<i class="material-icons">done</i>',

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
    isSyncDisabled(): boolean {
      return this.SYNC_COLLECTIONS && this.SYNC_ENVIRONMENTS && this.SYNC_HISTORY
    }
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
    initSettings() {
      applySetting("syncHistory", true)
      applySetting("syncCollections", true)
      applySetting("syncEnvironments", true)
    },
    resetProxy({ target }: { target: HTMLElement }) {
      applySetting("PROXY_URL", `https://proxy.hoppscotch.io/`)

      target.innerHTML = this.doneButton
      this.$toast.info(this.$t("cleared"), {
        icon: "clear_all",
      })
      setTimeout(
        () => (target.innerHTML = '<i class="material-icons">clear_all</i>'),
        1000
      )
    },
  },
})
</script>
