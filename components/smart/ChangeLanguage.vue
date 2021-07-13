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
        <TabPrimary
          v-tippy="{ theme: 'tooltip' }"
          :title="$t('choose_language')"
          :label="`${
            $i18n.locales.find(({ code }) => code == $i18n.locale).country
          } ${$i18n.locales.find(({ code }) => code == $i18n.locale).name}`"
        />
      </template>
      <SmartItem
        v-for="(locale, index) in $i18n.locales.filter(
          ({ code }) => code !== $i18n.locale
        )"
        :key="`locale-${index}`"
        :to="switchLocalePath(locale.code).toString()"
        :label="`${locale.country} ${locale.name}`"
        @click.native="$refs.language.tippy().hide()"
      />
    </tippy>
  </span>
</template>
