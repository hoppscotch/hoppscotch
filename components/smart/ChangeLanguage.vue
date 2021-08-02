<template>
  <span class="inline-flex">
    <tippy
      ref="language"
      interactive
      tabindex="-1"
      trigger="click"
      theme="popover"
      arrow
      :animate-fill="false"
    >
      <template #trigger>
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :title="$t('choose_language')"
          class="font-medium focus:outline-none"
          outline
          :label="`${
            $i18n.locales.find(({ code }) => code == $i18n.locale).name
          }`"
        />
      </template>
      <nuxt-link
        v-for="(locale, index) in $i18n.locales.filter(
          ({ code }) => code !== $i18n.locale
        )"
        :key="`locale-${index}`"
        :to="switchLocalePath(locale.code)"
        @click="$refs.language.tippy().hide()"
      >
        <SmartItem :label="locale.name" />
      </nuxt-link>
    </tippy>
  </span>
</template>
