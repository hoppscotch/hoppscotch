<template>
  <div class="page">
    <AppSection :label="$t('account')" ref="account" no-legend>
      <div class="flex flex-col">
        <label>{{ $t("account") }}</label>
        <div v-if="fb.currentUser">
          <button class="icon">
            <img
              v-if="fb.currentUser.photoURL"
              :src="fb.currentUser.photoURL"
              class="rounded-full material-icons"
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
          <p v-for="setting in fb.currentSettings" :key="setting.id">
            <SmartToggle
              :key="setting.name"
              :on="setting.value"
              @change="toggleSettings(setting.name, setting.value)"
            >
              {{ $t(setting.name) + " " + $t("sync") }}
              {{ setting.value ? $t("enabled") : $t("disabled") }}
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
          <SmartToggle
            :on="settings.SCROLL_INTO_ENABLED"
            @change="toggleSetting('SCROLL_INTO_ENABLED')"
          >
            {{ $t("scrollInto_use_toggle") }}
            {{ settings.SCROLL_INTO_ENABLED ? $t("enabled") : $t("disabled") }}
          </SmartToggle>
        </span>
      </div>
    </AppSection>

    <AppSection :label="$t('extensions')" ref="extensions" no-legend>
      <div class="flex flex-col">
        <label>{{ $t("extensions") }}</label>
        <div class="row-wrapper">
          <SmartToggle
            :on="settings.EXTENSIONS_ENABLED"
            @change="toggleSetting('EXTENSIONS_ENABLED')"
          >
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
            <SmartToggle :on="settings.PROXY_ENABLED" @change="toggleSetting('PROXY_ENABLED')">
              {{ $t("proxy") }}
              {{ settings.PROXY_ENABLED ? $t("enabled") : $t("disabled") }}
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
          v-model="settings.PROXY_URL"
          :disabled="!settings.PROXY_ENABLED"
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
            :on="settings.EXPERIMENTAL_URL_BAR_ENABLED"
            @change="toggleSetting('EXPERIMENTAL_URL_BAR_ENABLED')"
          >
            {{ $t("use_experimental_url_bar") }}
          </SmartToggle>
        </div>
      </div>
    </AppSection>
  </div>
</template>

<script>
import { fb } from "~/helpers/fb"
import { hasExtensionInstalled } from "../helpers/strategies/ExtensionStrategy"

export default {
  data() {
    return {
      extensionVersion: hasExtensionInstalled()
        ? window.__POSTWOMAN_EXTENSION_HOOK__.getVersion()
        : null,

      settings: {
        SCROLL_INTO_ENABLED:
          typeof this.$store.state.postwoman.settings.SCROLL_INTO_ENABLED !== "undefined"
            ? this.$store.state.postwoman.settings.SCROLL_INTO_ENABLED
            : true,

        PROXY_ENABLED: this.$store.state.postwoman.settings.PROXY_ENABLED || false,
        PROXY_URL: this.$store.state.postwoman.settings.PROXY_URL || "https://proxy.hoppscotch.io",
        PROXY_KEY: this.$store.state.postwoman.settings.PROXY_KEY || "",

        EXTENSIONS_ENABLED:
          typeof this.$store.state.postwoman.settings.EXTENSIONS_ENABLED !== "undefined"
            ? this.$store.state.postwoman.settings.EXTENSIONS_ENABLED
            : true,

        EXPERIMENTAL_URL_BAR_ENABLED:
          typeof this.$store.state.postwoman.settings.EXPERIMENTAL_URL_BAR_ENABLED !== "undefined"
            ? this.$store.state.postwoman.settings.EXPERIMENTAL_URL_BAR_ENABLED
            : false,
      },

      doneButton: '<i class="material-icons">done</i>',
      fb,
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
    applySetting(key, value) {
      this.settings[key] = value
      this.$store.commit("postwoman/applySetting", [key, value])
    },
    toggleSetting(key) {
      this.settings[key] = !this.settings[key]
      this.$store.commit("postwoman/applySetting", [key, this.settings[key]])
    },
    toggleSettings(name, value) {
      fb.writeSettings(name, !value)
      if (name === "syncCollections" && value) {
        this.syncCollections()
      }
      if (name === "syncEnvironments" && value) {
        this.syncEnvironments()
      }
    },
    initSettings() {
      fb.writeSettings("syncHistory", true)
      fb.writeSettings("syncCollections", true)
      fb.writeSettings("syncEnvironments", true)
    },
    resetProxy({ target }) {
      this.settings.PROXY_URL = `https://proxy.hoppscotch.io`
      target.innerHTML = this.doneButton
      this.$toast.info(this.$t("cleared"), {
        icon: "clear_all",
      })
      setTimeout(() => (target.innerHTML = '<i class="material-icons">clear_all</i>'), 1000)
    },
    syncCollections() {
      if (fb.currentUser !== null && fb.currentSettings[0]) {
        if (fb.currentSettings[0].value) {
          fb.writeCollections(JSON.parse(JSON.stringify(this.$store.state.postwoman.collections)))
        }
      }
    },
    syncEnvironments() {
      if (fb.currentUser !== null && fb.currentSettings[1]) {
        if (fb.currentSettings[1].value) {
          fb.writeEnvironments(JSON.parse(JSON.stringify(this.$store.state.postwoman.environments)))
        }
      }
    },
  },
  computed: {
    proxySettings() {
      return {
        url: this.settings.PROXY_URL,
        key: this.settings.PROXY_KEY,
      }
    },
  },
  head() {
    return {
      title: `Settings • Hoppscotch`,
    }
  },
}
</script>
