<template>
  <div class="page">
    <pw-section class="cyan" label="Theme" ref="theme">
      <ul>
        <li>
          <h3 class="title">Background</h3>
          <div class="backgrounds">
            <span
              :key="theme.class"
              @click="applyTheme(theme)"
              v-for="theme in themes"
            >
              <swatch
                :active="settings.THEME_CLASS === theme.class"
                :class="{ vibrant: theme.vibrant }"
                :color="theme.color"
                :name="theme.name"
              ></swatch>
            </span>
          </div>
        </li>
      </ul>
      <ul>
        <li>
          <h3 class="title">Color</h3>
          <div class="colors">
            <span
              :key="entry.color"
              @click.prevent="setActiveColor(entry.color, entry.vibrant)"
              v-for="entry in colors"
            >
              <swatch
                :active="settings.THEME_COLOR === entry.color.toUpperCase()"
                :class="{ vibrant: entry.vibrant }"
                :color="entry.color"
                :name="entry.name"
              />
            </span>
          </div>
        </li>
      </ul>
      <ul>
        <li>
          <h3 class="title">Labels</h3>
          <span>
            <pw-toggle
              :on="settings.FRAME_COLORS_ENABLED"
              @change="toggleSetting('FRAME_COLORS_ENABLED')"
              >Multi-color
              {{
                settings.FRAME_COLORS_ENABLED ? "Enabled" : "Disabled"
              }}</pw-toggle
            >
          </span>
        </li>
      </ul>
    </pw-section>

    <br />

    <pw-section class="blue" label="Proxy" ref="proxy">
      <ul>
        <li>
          <div class="flex-wrap">
            <span>
              <pw-toggle
                :on="settings.PROXY_ENABLED"
                @change="toggleSetting('PROXY_ENABLED')"
                >Proxy
                {{ settings.PROXY_ENABLED ? "enabled" : "disabled" }}</pw-toggle
              >
            </span>
            <a
              href="https://github.com/liyasthomas/postwoman/wiki/Proxy"
              target="_blank"
              rel="noopener"
            >
              <button class="icon" v-tooltip="'Wiki'">
                <i class="material-icons">help</i>
              </button>
            </a>
          </div>
        </li>
      </ul>
      <ul class="info">
        <li>
          <p>
            Postwoman's Proxy is hosted by ApolloTV.
            <br />
            Read the
            <a href="https://apollotv.xyz/legal" target="_blank" rel="noopener"
              >ApolloTV privacy policy</a
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

<style scoped>
.info {
  margin-left: 4px;
  color: var(--fg-light-color);
}
</style>

<script>
export default {
  components: {
    "pw-section": () => import("../components/section"),
    "pw-toggle": () => import("../components/toggle"),
    swatch: () => import("../components/settings/swatch")
  },

  data() {
    return {
      // NOTE:: You need to first set the CSS for your theme in /assets/css/themes.scss
      //        You should copy the existing light theme as a template and then just
      //        set the relevant values.
      themes: [
        {
          color: "#252628",
          name: "Kinda Dark",
          class: "",
          aceEditor: "dracula"
        },
        {
          color: "#ffffff",
          name: "Clearly White",
          vibrant: true,
          class: "light",
          aceEditor: "xcode"
        },
        {
          color: "#000000",
          name: "Just Black",
          class: "black",
          aceEditor: "vibrant_ink"
        },
        {
          color: "var(--bg-color)",
          name: "Auto (system)",
          vibrant: window.matchMedia("(prefers-color-scheme: light)").matches,
          class: "auto",
          aceEditor: window.matchMedia("(prefers-color-scheme: light)").matches
            ? "xcode"
            : "dracula"
        }
      ],
      // You can define a new color here! It will simply store the color value.
      colors: [
        // If the color is vibrant, black is used as the active foreground color.
        {
          color: "#50fa7b",
          name: "Green",
          vibrant: true
        },
        {
          color: "#f1fa8c",
          name: "Yellow",
          vibrant: true
        },
        {
          color: "#ff79c6",
          name: "Pink",
          vibrant: true
        },
        {
          color: "#ff5555",
          name: "Red",
          vibrant: false
        },
        {
          color: "#bd93f9",
          name: "Purple",
          vibrant: true
        },
        {
          color: "#ffb86c",
          name: "Orange",
          vibrant: true
        },
        {
          color: "#8be9fd",
          name: "Cyan",
          vibrant: true
        },
        {
          color: "#57b5f9",
          name: "Blue",
          vibrant: false
        }
      ],

      settings: {
        THEME_CLASS: this.$store.state.postwoman.settings.THEME_CLASS || "",
        THEME_COLOR: "",
        THEME_TAB_COLOR: "",
        THEME_COLOR_VIBRANT: true,

        FRAME_COLORS_ENABLED:
          this.$store.state.postwoman.settings.FRAME_COLORS_ENABLED || false,
        PROXY_ENABLED:
          this.$store.state.postwoman.settings.PROXY_ENABLED || false,
        PROXY_URL: this.$store.state.postwoman.settings.PROXY_URL || "",
        PROXY_KEY: this.$store.state.postwoman.settings.PROXY_KEY || ""
      }
    };
  },

  watch: {
    proxySettings: {
      deep: true,
      handler(value) {
        this.applySetting("PROXY_URL", value.url);
        this.applySetting("PROXY_KEY", value.key);
      }
    }
  },

  methods: {
    applyTheme({ class: name, color, aceEditor }) {
      this.applySetting("THEME_CLASS", name);
      this.applySetting("THEME_ACE_EDITOR", aceEditor);
      document
        .querySelector("meta[name=theme-color]")
        .setAttribute("content", color);
      this.applySetting("THEME_TAB_COLOR", color);
      document.documentElement.className = name;
    },
    setActiveColor(color, vibrant) {
      // By default, the color is vibrant.
      if (vibrant == null) vibrant = true;
      document.documentElement.style.setProperty("--ac-color", color);
      document.documentElement.style.setProperty(
        "--act-color",
        vibrant ? "rgb(37, 38, 40)" : "#f8f8f2"
      );
      this.applySetting("THEME_COLOR", color.toUpperCase());
      this.applySetting("THEME_COLOR_VIBRANT", vibrant);
    },
    getActiveColor() {
      // This strips extra spaces and # signs from the strings.
      const strip = str => str.replace(/#/g, "").replace(/ /g, "");
      return `#${strip(
        window
          .getComputedStyle(document.documentElement)
          .getPropertyValue("--ac-color")
      ).toUpperCase()}`;
    },
    applySetting(key, value) {
      this.settings[key] = value;
      this.$store.commit("postwoman/applySetting", [key, value]);
    },
    toggleSetting(key) {
      this.settings[key] = !this.settings[key];
      this.$store.commit("postwoman/applySetting", [key, this.settings[key]]);
      this.$router.replace("/settings", {
        force: true
      });
    }
  },
  beforeMount() {
    this.settings.THEME_COLOR = this.getActiveColor();
  },

  computed: {
    proxySettings() {
      return {
        url: this.settings.PROXY_URL,
        key: this.settings.PROXY_KEY
      };
    }
  }
};
</script>
