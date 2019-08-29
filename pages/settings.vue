<template>
  <div class="page">
    <pw-section class="blue" label="Theme">
      <ul>
        <li>
          <h3 class="title">Background</h3>
          <div class="backgrounds">
            <span :key="theme.class" @click="applyTheme(theme.class)" v-for="theme in themes">
              <swatch :active="settings.THEME_CLASS === theme.class" :class="{ vibrant: theme.vibrant }" :color="theme.color" :name="theme.name"></swatch>
            </span>
          </div>
        </li>
      </ul>
      <ul>
        <li>
          <h3 class="title">Color</h3>
          <div class="colors">
            <span :key="entry.color" @click.prevent="setActiveColor(entry.color, entry.vibrant)" v-for="entry in colors">
              <swatch :active="settings.THEME_COLOR === entry.color.toUpperCase()" :class="{ vibrant: entry.vibrant }" :color="entry.color" :name="entry.name" />
            </span>
          </div>
        </li>
      </ul>
      <ul>
        <li>
          <h3 class="title">Frames</h3>
          <pw-toggle :on="!settings.DISABLE_FRAME_COLORS" @change="toggleSetting('DISABLE_FRAME_COLORS')">
              Multi-color {{ settings.DISABLE_FRAME_COLORS ? "disabled" : "enabled" }}
          </pw-toggle>
        </li>
      </ul>
    </pw-section>

      <!--<pw-section class="blue" label="Proxy">
          <ul>
              <li>
                  <p>
                      <input :checked="settings.PROXY_ENABLED" @change="toggleSetting('PROXY_ENABLED')"
                             id="enableProxy"
                             type="checkbox">
                      <label for="enableProxy">Enable proxy</label>
                  </p>
              </li>
          </ul>

          <ul>
              <li>
                  <label for="url">URL</label>
                  <input id="url" type="url" v-model="url">
              </li>
              <li>
                  <label for="key">Key</label>
                  <input id="key" type="password" v-model="url">
              </li>
          </ul>
      </pw-section>-->
  </div>
</template>
<script>
  import section from "../components/section";
  import swatch from "../components/settings/swatch";
  import toggle from "../components/toggle";

  export default {
    data() {
      return {
        // NOTE:: You need to first set the CSS for your theme in /assets/css/themes.scss
        //        You should copy the existing light theme as a template and then just
        //        set the relevant values.
        themes: [{
            "color": "#121212",
            "name": "Dark (Default)",
            "class": ""
          },
          {
            "color": "#DFDFDF",
            "name": "Light",
            "vibrant": true,
            "class": "light"
          }
        ],
        // You can define a new color here! It will simply store the color value.
        colors: [
          // If the color is vibrant, black is used as the active foreground color.
          {
            "color": "#51ff0d",
            "name": "Lime (Default)",
            "vibrant": true
          },
          {
            "color": "#FFC107",
            "name": "Yellow",
            "vibrant": true
          },
          {
            "color": "#E91E63",
            "name": "Pink",
            "vibrant": false
          },
          {
            "color": "#e74c3c",
            "name": "Red",
            "vibrant": false
          },
          {
            "color": "#9b59b6",
            "name": "Purple",
            "vibrant": false
          },
          {
            "color": "#2980b9",
            "name": "Blue",
            "vibrant": false
          },
        ],
        settings: {
          THEME_CLASS: this.$store.state.postwoman.settings.THEME_CLASS || '',
          THEME_COLOR: '',
          THEME_COLOR_VIBRANT: true,

          PROXY_ENABLED: this.$store.state.postwoman.settings.PROXY_ENABLED || false,
          DISABLE_FRAME_COLORS: this.$store.state.postwoman.settings.DISABLE_FRAME_COLORS || false
        }
      }
    },
    components: {
      'pw-section': section,
      'pw-toggle': toggle,
      'swatch': swatch
    },
    methods: {
      applyTheme(name) {
        this.applySetting('THEME_CLASS', name);
        document.documentElement.className = name;
        let imgGitHub = document.getElementById("imgGitHub");
        imgGitHub.style['filter'] = "";
        imgGitHub.style['webkit-filter'] = "invert(100%)";
        if (name.includes("light")){
            imgGitHub.style['filter'] = "invert(100%)";
            imgGitHub.style['webkit-filter'] = "invert(100%)";
        }
      },
      setActiveColor(color, vibrant) {
        // By default, the color is vibrant.
        if (vibrant == null) vibrant = true;
        document.documentElement.style.setProperty('--ac-color', color);
        document.documentElement.style.setProperty('--act-color', vibrant ? '#121212' : '#fff');
        this.applySetting('THEME_COLOR', color.toUpperCase());
        this.applySetting('THEME_COLOR_VIBRANT', vibrant);
      },
      getActiveColor() {
        // This strips extra spaces and # signs from the strings.
        const strip = (str) => str.replace(/#/g, '').replace(/ /g, '');
        return `#${strip(window.getComputedStyle(document.documentElement).getPropertyValue('--ac-color')).toUpperCase()}`;
      },
      applySetting(key, value) {
        this.settings[key] = value;
        this.$store.commit('postwoman/applySetting', [key, value]);
      },
      toggleSetting(key) {
        this.settings[key] = !this.settings[key];
        this.$store.commit('postwoman/applySetting', [key, this.settings[key]]);
      }
    },
    beforeMount() {
      this.settings.THEME_COLOR = this.getActiveColor();
    }
  }

</script>
