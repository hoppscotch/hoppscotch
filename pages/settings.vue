<template>
  <div class="page">
    <pw-section class="blue" label="Theme">
      <ul>
        <li>
          <h3 class="title">Background</h3>
          <div class="backgrounds">
            <span v-for="theme in themes" :key="theme.class" @click="applyTheme(theme.class)">
              <swatch :color="theme.color" :name="theme.name" :class="{ vibrant: theme.vibrant }" :active="settings.THEME_CLASS === theme.class"></swatch>
            </span>
          </div>
        </li>
      </ul>
      <ul>
        <li>
          <h3 class="title">Color</h3>
          <div class="colors">
            <span v-for="entry in colors" :key="entry.color" @click.prevent="setActiveColor(entry.color, entry.vibrant)">
              <swatch :color="entry.color" :name="entry.name" :class="{ vibrant: entry.vibrant }" :active="settings.THEME_COLOR === entry.color.toUpperCase()" />
            </span>
          </div>
        </li>
      </ul>
      <ul>
        <li>
          <h3 class="title">Frames</h3>
          <input id="disableFrameColors" type="checkbox" :checked="!settings.DISABLE_FRAME_COLORS" @change="toggleSetting('DISABLE_FRAME_COLORS')">
          <label for="disableFrameColors">Enable multi-color</label>
        </li>
      </ul>
    </pw-section>
  </div>
</template>
<script>
  import section from "../components/section";
  import swatch from "../components/settings/swatch";
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
          DISABLE_FRAME_COLORS: this.$store.state.postwoman.settings.DISABLE_FRAME_COLORS || false
        }
      }
    },
    components: {
      'pw-section': section,
      'swatch': swatch
    },
    methods: {
      applyTheme(name) {
        this.applySetting('THEME_CLASS', name);
        document.documentElement.className = name;
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
