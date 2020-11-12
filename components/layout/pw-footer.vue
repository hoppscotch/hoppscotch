<template>
  <footer class="flex-col flex-no-wrap">
    <div class="row-wrapper">
      <span
        v-if="version.name"
        class="flex flex-col flex-wrap justify-start font-mono md:flex-row"
        style="align-items: start"
      >
        <a
          class="footer-link"
          :href="'https://github.com/hoppscotch/hoppscotch/releases/tag/' + version.name"
          target="_blank"
          rel="noopener"
          v-tooltip="'GitHub'"
        >
          {{ version.name }}
        </a>
        <a class="footer-link" href="https://www.netlify.com" target="_blank" rel="noopener">
          Powered by Netlify
        </a>
        <a
          class="footer-link"
          href="https://paw.cloud/?utm_source=hoppscotch&utm_medium=website&utm_campaign=hoppscotch-sponsorship"
          target="_blank"
          rel="noopener"
        >
          Sponsored by Paw
        </a>
        <!-- <span v-if="version.hash">
          -
          <a
            :href="'https://github.com/hoppscotch/hoppscotch/commit/' + version.hash"
            target="_blank"
            rel="noopener"
          >{{version.hash}}</a>
        </span> -->
        <!-- <span v-if="version.variant">({{version.variant}})</span> -->
      </span>
      <span
        class="flex flex-col flex-wrap justify-start font-mono md:flex-row"
        style="align-items: start"
      >
        <a href="https://liyasthomas.web.app" target="_blank" rel="noopener">
          <button class="icon" v-tooltip="'Liyas Thomas'">🦄</button>
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
  @apply inline-flex;
  @apply flex-shrink-0;
  @apply my-2;
  @apply mx-4;
  @apply text-fgLightColor;

  &:hover {
    @apply text-fgColor;
  }
}
</style>

<script>
import * as version from "../../.hoppscotch/version.json"

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
      return this.$i18n.locales.filter(({ code }) => code !== this.$i18n.locale)
    },
  },
}
</script>
