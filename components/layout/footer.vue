<template>
  <footer class="footer">
    <div class="flex-wrap">
      <span v-if="version.name" class="mono">
        <a
          class="footer-link"
          :href="'https://github.com/liyasthomas/postwoman/releases/tag/' + version.name"
          target="_blank"
          rel="noopener"
          v-tooltip="'GitHub'"
        >
          {{ version.name }}
        </a>
        <a
          class="footer-link hide-on-small-screen"
          href="https://www.netlify.com"
          target="_blank"
          rel="noopener"
        >
          Powered by Netlify
        </a>
        <!-- <span v-if="version.hash">
          -
          <a
            :href="'https://github.com/liyasthomas/postwoman/commit/' + version.hash"
            target="_blank"
            rel="noopener"
          >{{version.hash}}</a>
        </span> -->
        <!-- <span v-if="version.variant">({{version.variant}})</span> -->
      </span>
      <span>
        <a href="https://liyasthomas.web.app" target="_blank" rel="noopener">
          <button class="icon" v-tooltip="'Liyas Thomas'">
            🦄
          </button>
        </a>
        <a href="mailto:liyascthomas@gmail.com" target="_blank" rel="noopener">
          <button class="icon" v-tooltip="$t('contact_us')">
            <i class="material-icons">email</i>
          </button>
        </a>
        <v-popover>
          <button class="icon" v-tooltip="$t('choose_language')">
            <i class="material-icons">translate</i>
          </button>
          <template slot="popover">
            <div v-for="locale in availableLocales" :key="locale.code">
              <nuxt-link :to="switchLocalePath(locale.code)">
                <button class="icon" v-close-popover>
                  {{ locale.name }}
                </button>
              </nuxt-link>
            </div>
          </template>
        </v-popover>
      </span>
    </div>
  </footer>
</template>

<style scoped lang="scss">
.footer-link {
  margin: 8px 16px;
}
</style>

<script>
import * as version from "../../.postwoman/version.json"

export default {
  data() {
    return {
      version: {},
    }
  },

  beforeMount() {
    // Set version data
    this.version = version.default
  },

  computed: {
    availableLocales() {
      return this.$i18n.locales.filter(i => i.code !== this.$i18n.locale)
    },
  },
}
</script>
