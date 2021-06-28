<template>
  <footer class="footer">
    <div class="flex justify-between items-center flex-1">
      <span class="flex text-xs font-mono" style="align-items: start"> </span>
      <span class="flex text-xs font-mono" style="align-items: start">
        <a href="mailto:support@hoppscotch.io" target="_blank" rel="noopener">
          <button class="icon button">
            <i class="material-icons text-xl">email</i>
            <span>
              {{ $t("contact_us") }}
            </span>
          </button>
        </a>
        <v-popover>
          <button v-tooltip="$t('choose_language')" class="icon button">
            <i class="material-icons text-xl">translate</i>
            <span>
              {{ $i18n.locales.find(({ code }) => code === $i18n.locale).name }}
            </span>
          </button>
          <template slot="popover">
            <div v-for="locale in availableLocales" :key="locale.code">
              <nuxt-link :to="switchLocalePath(locale.code)">
                <button v-close-popover class="icon button">
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

<script>
export default {
  computed: {
    availableLocales() {
      return this.$i18n.locales.filter(({ code }) => code !== this.$i18n.locale)
    },
  },
}
</script>

<style scoped lang="scss">
.footer-link {
  @apply flex-shrink-0;
  @apply my-2 mx-4;
  @apply text-secondaryLight text-sm;
  @apply hover:text-secondary;
}
</style>
