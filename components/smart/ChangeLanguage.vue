<template>
  <span class="inline-flex">
    <span class="select-wrapper">
      <tippy ref="language" interactive trigger="click" theme="popover" arrow>
        <template #trigger>
          <ButtonSecondary
            v-tippy="{ theme: 'tooltip' }"
            :title="$t('settings.choose_language')"
            class="pr-8"
            outline
            icon="language"
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
  </span>
</template>
