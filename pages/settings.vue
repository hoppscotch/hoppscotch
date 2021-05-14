<template>
  <div class="page">
    <div v-if="currentUser && currentUser.eaInvited">
      <Teams />
    </div>

    <AppSection :label="$t('account')" ref="account" no-legend>
      <div class="flex flex-col">
        <label>{{ $t("account") }}</label>
        <div v-if="fb.currentUser">
          <button class="icon">
            <img
              v-if="fb.currentUser.photoURL"
              :src="fb.currentUser.photoURL"
              class="w-6 h-6 rounded-full material-icons"
            />
            <i v-else class="material-icons">account_circle</i>
            <span>
              {{ fb.currentUser.displayName || $t("nothing_found") }}
            </span>
          </button>
          <br />
          <button class="icon">
            <i class="material-icons">email</i>
            <span>
              {{ fb.currentUser.email || $t("nothing_found") }}
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
            <SmartToggle :on="SYNC_HISTORY" @change="toggleSettings('syncHistory', !SYNC_HISTORY)">
              {{ $t("syncHistory") + " " + $t("sync") }}
              {{ SYNC_HISTORY ? $t("enabled") : $t("disabled") }}
            </SmartToggle>
          </p>

          <p v-if="fb.currentSettings.length !== 3">
            <button @click="initSettings">
              <i class="material-icons">sync</i>
              <span>{{ $t("turn_on") + " " + $t("sync") }}</span>
            </button>
          </p>
        </div>
        <div v-else>
          <label>{{ $t("login_with") }}</label>
          <p>
            <FirebaseLogin />
          </p>
        </div>
      </div>
    </AppSection>

    <AppSection :label="$t('theme')" ref="theme" no-legend>
      <div class="flex flex-col">
        <label>{{ $t("theme") }}</label>
        <SmartColorModePicker />
        <SmartAccentModePicker />
        <span>
          <SmartToggle :on="SCROLL_INTO_ENABLED" @change="toggleSetting('SCROLL_INTO_ENABLED')">
            {{ $t("scrollInto_use_toggle") }}
            {{ SCROLL_INTO_ENABLED ? $t("enabled") : $t("disabled") }}
          </SmartToggle>
        </span>
      </div>
    </AppSection>

    <AppSection :label="$t('extensions')" ref="extensions" no-legend>
      <div class="flex flex-col">
        <label>{{ $t("extensions") }}</label>
        <div class="row-wrapper">
          <SmartToggle :on="EXTENSIONS_ENABLED" @change="toggleSetting('EXTENSIONS_ENABLED')">
            {{ $t("extensions_use_toggle") }}
          </SmartToggle>
        </div>
        <p v-if="extensionVersion != null" class="info">
          {{ $t("extension_version") }}: v{{ extensionVersion.major }}.{{ extensionVersion.minor }}
        </p>
        <p v-else class="info">
          {{ $t("extension_version") }}: {{ $t("extension_ver_not_reported") }}
        </p>
      </div>
    </AppSection>

    <AppSection :label="$t('proxy')" ref="proxy" no-legend>
      <div class="flex flex-col">
        <label>{{ $t("proxy") }}</label>
        <div class="row-wrapper">
          <span>
            <SmartToggle :on="PROXY_ENABLED" @change="toggleSetting('PROXY_ENABLED')">
              {{ $t("proxy") }}
              {{ PROXY_ENABLED ? $t("enabled") : $t("disabled") }}
            </SmartToggle>
          </span>
          <a
            href="https://github.com/hoppscotch/hoppscotch/wiki/Proxy"
            target="_blank"
            rel="noopener"
          >
            <button class="icon" v-tooltip="$t('wiki')">
              <i class="material-icons">help_outline</i>
            </button>
          </a>
        </div>
        <div class="row-wrapper">
          <label for="url">{{ $t("url") }}</label>
          <button class="icon" @click="resetProxy" v-tooltip.bottom="$t('reset_default')">
            <i class="material-icons">clear_all</i>
          </button>
        </div>
        <input
          id="url"
          type="url"
          v-model="PROXY_URL"
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

    <AppSection :label="$t('experiments')" ref="experiments" no-legend>
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
  </div>
</template>

<script lang="ts">
import { fb } from "~/helpers/fb"
import { hasExtensionInstalled } from "../helpers/strategies/ExtensionStrategy"
import {
  getSettingSubject,
  applySetting,
  toggleSetting,
  defaultSettings,
} from "~/newstore/settings"
import type { KeysMatching } from "~/types/ts-utils"
import { currentUserInfo$ } from "~/helpers/teams/BackendUserInfo"

import Vue from "vue"

type SettingsType = typeof defaultSettings

export default Vue.extend({
  data() {
    return {
      extensionVersion: hasExtensionInstalled()
        ? window.__POSTWOMAN_EXTENSION_HOOK__.getVersion()
        : null,

      doneButton: '<i class="material-icons">done</i>',
      fb,

      SYNC_COLLECTIONS: true,
      SYNC_ENVIRONMENTS: true,
      SYNC_HISTORY: true,

      PROXY_URL: "",
      PROXY_KEY: "",

      EXTENSIONS_ENABLED: true,
      PROXY_ENABLED: true,
    }
  },
  subscriptions() {
    return {
      SCROLL_INTO_ENABLED: getSettingSubject("SCROLL_INTO_ENABLED"),

      PROXY_ENABLED: getSettingSubject("PROXY_ENABLED"),
      PROXY_URL: getSettingSubject("PROXY_URL"),
      PROXY_KEY: getSettingSubject("PROXY_KEY"),

      EXTENSIONS_ENABLED: getSettingSubject("EXTENSIONS_ENABLED"),

      EXPERIMENTAL_URL_BAR_ENABLED: getSettingSubject("EXPERIMENTAL_URL_BAR_ENABLED"),

      SYNC_COLLECTIONS: getSettingSubject("syncCollections"),
      SYNC_ENVIRONMENTS: getSettingSubject("syncEnvironments"),
      SYNC_HISTORY: getSettingSubject("syncHistory"),

      // Teams feature flag
      currentUser: currentUserInfo$,
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
    toggleSettings<K extends KeysMatching<SettingsType, boolean>>(name: K, value: SettingsType[K]) {
      this.applySetting(name, value)

      if (name === "syncCollections" && value) {
        this.syncCollections()
      }
      if (name === "syncEnvironments" && value) {
        this.syncEnvironments()
      }
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
      setTimeout(() => (target.innerHTML = '<i class="material-icons">clear_all</i>'), 1000)
    },
    syncCollections(): void {
      if (fb.currentUser !== null && this.SYNC_COLLECTIONS) {
        fb.writeCollections(
          JSON.parse(JSON.stringify(this.$store.state.postwoman.collections)),
          "collections"
        )
        fb.writeCollections(
          JSON.parse(JSON.stringify(this.$store.state.postwoman.collectionsGraphql)),
          "collectionsGraphql"
        )
      }
    },
    syncEnvironments(): void {
      if (fb.currentUser !== null && this.SYNC_ENVIRONMENTS) {
        fb.writeEnvironments(JSON.parse(JSON.stringify(this.$store.state.postwoman.environments)))
      }
    },
  },
  computed: {
    proxySettings(): { url: string; key: string } {
      return {
        url: this.PROXY_URL,
        key: this.PROXY_KEY,
      }
    },
  },
  head() {
    return {
      title: `Settings • Hoppscotch`,
    }
  },
})
</script>
