<template>
  <span>
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
        <SmartLink
          v-tippy="{ theme: 'tooltip' }"
          :title="$t('choose_language')"
          class="font-medium focus:outline-none"
        >
          {{ `${$i18n.locales.find(({ code }) => code == $i18n.locale).name}` }}
        </SmartLink>
      </template>
      <nuxt-link
        v-for="(locale, index) in $i18n.locales.filter(
          ({ code }) => code !== $i18n.locale
        )"
        :key="`locale-${index}`"
        :to="switchLocalePath(locale.code)"
        @click="$refs.language.tippy().hide()"
      >
        <SmartItem
          :label="`${getFlagEmoji(locale.country)} \xA0 ${locale.name}`"
        />
      </nuxt-link>
    </tippy>
  </span>
</template>

<script>
export default {
  methods: {
    getFlagEmoji(c) {
      return String.fromCodePoint(
        ...[...c.toUpperCase()].map((x) => 0x1f1a5 + x.charCodeAt())
      )
    },
  },
}
</script>
