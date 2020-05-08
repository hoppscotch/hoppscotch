<template>
  <div class="page">
    <pw-section class="green" :label="$t('account')" ref="account">
      <ul>
        <li>
          <div v-if="fb.currentUser">
            <button class="icon">
              <img
                v-if="fb.currentUser.photoURL"
                :src="fb.currentUser.photoURL"
                class="material-icons"
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
            <logout />
            <p v-for="setting in fb.currentSettings" :key="setting.id">
              <pw-toggle
                :key="setting.name"
                :on="setting.value"
                @change="toggleSettings(setting.name, setting.value)"
              >
                {{ $t(setting.name) + " " + $t("sync") }}
                {{ setting.value ? $t("enabled") : $t("disabled") }}
              </pw-toggle>
            </p>
            <p v-if="fb.currentSettings.length !== 3">
              <button class="" @click="initSettings">
                <i class="material-icons">sync</i>
                <span>{{ $t("turn_on") + " " + $t("sync") }}</span>
              </button>
            </p>
          </div>
          <div v-else>
            <label>{{ $t("login_with") }}</label>
            <p>
              <login />
            </p>
          </div>
        </li>
      </ul>
    </pw-section>

    <pw-section class="cyan" :label="$t('theme')" ref="theme">
      <ul>
        <li>
          <label>{{ $t("background") }}</label>
          <div class="backgrounds">
            <span :key="theme.class" @click="applyTheme(theme)" v-for="theme in themes">
              <swatch
                :active="settings.THEME_CLASS === theme.class"
                :class="{ vibrant: theme.vibrant }"
                :color="theme.color"
                :name="theme.name"
                class="bg"
              />
            </span>
          </div>
        </li>
      </ul>
      <ul>
        <li>
          <label>{{ $t("color") }}</label>
          <div class="colors">
            <span
              :key="entry.color"
              @click="setActiveColor(entry.color, entry.vibrant)"
              v-for="entry in colors"
            >
              <swatch
                :active="settings.THEME_COLOR === entry.color.toUpperCase()"
                :class="{ vibrant: entry.vibrant }"
                :color="entry.color"
                :name="entry.name"
                class="fg"
              />
            </span>
          </div>
        </li>
      </ul>
      <ul>
        <li>
          <span>
            <pw-toggle
              :on="settings.FRAME_COLORS_ENABLED"
              @change="toggleSetting('FRAME_COLORS_ENABLED')"
            >
              {{ $t("multi_color") }}
              {{ settings.FRAME_COLORS_ENABLED ? $t("enabled") : $t("disabled") }}
            </pw-toggle>
          </span>
        </li>
      </ul>
      <ul>
        <li>
          <span>
            <pw-toggle
              :on="settings.SCROLL_INTO_ENABLED"
              @change="toggleSetting('SCROLL_INTO_ENABLED')"
            >
              {{ $t("scrollInto_use_toggle") }}
              {{ settings.SCROLL_INTO_ENABLED ? $t("enabled") : $t("disabled") }}
            </pw-toggle>
          </span>
        </li>
      </ul>
    </pw-section>

    <pw-section class="purple" :label="$t('extensions')" ref="extensions">
      <ul>
        <li>
          <div class="flex-wrap">
            <pw-toggle
              :on="settings.EXTENSIONS_ENABLED"
              @change="toggleSetting('EXTENSIONS_ENABLED')"
            >
              {{ $t("extensions_use_toggle") }}
            </pw-toggle>
          </div>
        </li>
      </ul>
    </pw-section>

    <pw-section class="blue" :label="$t('proxy')" ref="proxy">
      <ul>
        <li>
          <div class="flex-wrap">
            <span>
              <pw-toggle :on="settings.PROXY_ENABLED" @change="toggleSetting('PROXY_ENABLED')">
                {{ $t("proxy") }}
                {{ settings.PROXY_ENABLED ? $t("enabled") : $t("disabled") }}
              </pw-toggle>
            </span>
            <a
              href="https://github.com/liyasthomas/postwoman/wiki/Proxy"
              target="_blank"
              rel="noopener"
            >
              <button class="icon" v-tooltip="$t('wiki')">
                <i class="material-icons">help</i>
              </button>
            </a>
          </div>
        </li>
      </ul>
      <ul>
        <li>
          <div class="flex-wrap">
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
          />
        </li>
      </ul>
      <ul class="info">
        <li>
          <p>
            {{ $t("postwoman_official_proxy_hosting") }}
            <br />
            {{ $t("read_the") }}
            <a
              class="link"
              href="https://apollosoftware.xyz/legal/postwoman"
              target="_blank"
              rel="noopener"
            >
              {{ $t("apollosw_privacy_policy") }} </a
            >.
          </p>
        </li>
      </ul>
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
    </pw-section>
  </div>
</template>

<style scoped lang="scss"></style>

<script>
import firebase from "firebase/app"
import { fb } from "../functions/fb"

export default {
  components: {
    "pw-section": () => import("../components/layout/section"),
    "pw-toggle": () => import("../components/ui/toggle"),
    swatch: () => import("../components/settings/swatch"),
    login: () => import("../components/firebase/login"),
    logout: () => import("../components/firebase/logout"),
  },

  data() {
    return {
      // NOTE:: You need to first set the CSS for your theme in /assets/css/themes.scss
      //        You should copy the existing light theme as a template and then just
      //        set the relevant values.
      themes: [
        {
          color: "#202124",
          name: this.$t("kinda_dark"),
          class: "",
          aceEditor: "twilight",
        },
        {
          color: "#ffffff",
          name: this.$t("clearly_white"),
          vibrant: true,
          class: "light",
          aceEditor: "iplastic",
        },
        {
          color: "#000000",
          name: this.$t("just_black"),
          class: "black",
          aceEditor: "vibrant_ink",
        },
        {
          color: "var(--ac-color)",
          name: this.$t("auto_system"),
          vibrant: window.matchMedia("(prefers-color-scheme: light)").matches,
          class: "auto",
          aceEditor: window.matchMedia("(prefers-color-scheme: light)").matches
            ? "iplastic"
            : "twilight",
        },
      ],
      // You can define a new color here! It will simply store the color value.
      colors: [
        // If the color is vibrant, black is used as the active foreground color.
        {
          color: "#50fa7b",
          name: this.$t("green"),
          vibrant: true,
        },
        {
          color: "#f1fa8c",
          name: this.$t("yellow"),
          vibrant: true,
        },
        {
          color: "#ff79c6",
          name: this.$t("pink"),
          vibrant: true,
        },
        {
          color: "#ff5555",
          name: this.$t("red"),
          vibrant: false,
        },
        {
          color: "#bd93f9",
          name: this.$t("purple"),
          vibrant: true,
        },
        {
          color: "#ffb86c",
          name: this.$t("orange"),
          vibrant: true,
        },
        {
          color: "#8be9fd",
          name: this.$t("cyan"),
          vibrant: true,
        },
        {
          color: "#57b5f9",
          name: this.$t("blue"),
          vibrant: false,
        },
      ],

      settings: {
        SCROLL_INTO_ENABLED:
          typeof this.$store.state.postwoman.settings.SCROLL_INTO_ENABLED !== "undefined"
            ? this.$store.state.postwoman.settings.SCROLL_INTO_ENABLED
            : true,

        THEME_CLASS: "",
        THEME_COLOR: "",
        THEME_TAB_COLOR: "",
        THEME_COLOR_VIBRANT: true,

        FRAME_COLORS_ENABLED: this.$store.state.postwoman.settings.FRAME_COLORS_ENABLED || false,
        PROXY_ENABLED: this.$store.state.postwoman.settings.PROXY_ENABLED || false,
        PROXY_URL:
          this.$store.state.postwoman.settings.PROXY_URL || "https://postwoman.apollosoftware.xyz/",
        PROXY_KEY: this.$store.state.postwoman.settings.PROXY_KEY || "",

        EXTENSIONS_ENABLED:
          typeof this.$store.state.postwoman.settings.EXTENSIONS_ENABLED !== "undefined"
            ? this.$store.state.postwoman.settings.EXTENSIONS_ENABLED
            : true,
      },

      doneButton: '<i class="material-icons">done</i>',
      fb,
    }
  },

  watch: {
    proxySettings: {
      deep: true,
      handler(value) {
        this.applySetting("PROXY_URL", value.url)
        this.applySetting("PROXY_KEY", value.key)
      },
    },
  },

  methods: {
    applyTheme({ class: name, color, aceEditor }) {
      this.applySetting("THEME_CLASS", name)
      this.applySetting("THEME_ACE_EDITOR", aceEditor)
      document.querySelector("meta[name=theme-color]").setAttribute("content", color)
      this.applySetting("THEME_TAB_COLOR", color)
      document.documentElement.className = name
    },
    setActiveColor(color, vibrant) {
      // By default, the color is vibrant.
      if (vibrant === null) vibrant = true
      document.documentElement.style.setProperty("--ac-color", color)
      document.documentElement.style.setProperty(
        "--act-color",
        vibrant ? "rgba(32, 33, 36, 1)" : "rgba(255, 255, 255, 1)"
      )
      this.applySetting("THEME_COLOR", color.toUpperCase())
      this.applySetting("THEME_COLOR_VIBRANT", vibrant)
    },
    getActiveColor() {
      // This strips extra spaces and # signs from the strings.
      const strip = str => str.replace(/#/g, "").replace(/ /g, "")
      return `#${strip(
        window.getComputedStyle(document.documentElement).getPropertyValue("--ac-color")
      ).toUpperCase()}`
    },
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
        syncCollections()
      }
      if (name === "syncEnvironments" && value) {
        syncEnvironments()
      }
    },
    initSettings() {
      fb.writeSettings("syncHistory", true)
      fb.writeSettings("syncCollections", true)
      fb.writeSettings("syncEnvironments", true)
    },
    resetProxy({ target }) {
      this.settings.PROXY_URL = `https://postwoman.apollosoftware.xyz/`
      target.innerHTML = this.doneButton
      this.$toast.info(this.$t("cleared"), {
        icon: "clear_all",
      })
      setTimeout(() => (target.innerHTML = '<i class="material-icons">clear_all</i>'), 1000)
    },
    syncCollections() {
      if (fb.currentUser !== null) {
        if (fb.currentSettings[0].value) {
          fb.writeCollections(JSON.parse(JSON.stringify(this.$store.state.postwoman.collections)))
        }
      }
    },
    syncEnvironments() {
      if (fb.currentUser !== null) {
        if (fb.currentSettings[1].value) {
          fb.writeEnvironments(JSON.parse(JSON.stringify(this.$store.state.postwoman.environments)))
        }
      }
    },
  },

  beforeMount() {
    this.settings.THEME_CLASS = document.documentElement.className
    this.settings.THEME_COLOR = this.getActiveColor()
  },

  computed: {
    proxySettings() {
      return {
        url: this.settings.PROXY_URL,
        key: this.settings.PROXY_KEY,
      }
    },
  },
}
</script>
