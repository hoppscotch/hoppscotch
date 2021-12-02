<script setup lang="ts">
import { isDark, toggleDark } from "~/composables"

const { t, availableLocales, locale } = useI18n()

const toggleLocales = () => {
  // change to some real logic
  const locales = availableLocales
  locale.value = locales[(locales.indexOf(locale.value) + 1) % locales.length]
}
</script>

<template>
  <nav class="mt-6 text-xl">
    <RouterLink class="mx-2 icon-btn" to="/" :title="t('button.home')">
      <carbon-home />
    </RouterLink>

    <button
      class="mx-2 icon-btn !outline-none"
      :title="t('button.toggle_dark')"
      @click="toggleDark()"
    >
      <carbon-moon v-if="isDark" />
      <carbon-sun v-else />
    </button>

    <a
      class="mx-2 icon-btn"
      :title="t('button.toggle_langs')"
      @click="toggleLocales"
    >
      <carbon-language />
    </a>
  </nav>
</template>
