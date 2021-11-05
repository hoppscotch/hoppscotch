<template>
  <span class="inline-flex">
    <tippy ref="language" interactive trigger="click" theme="popover" arrow>
      <template #trigger>
        <span class="select-wrapper">
          <ButtonSecondary
            v-tippy="{ theme: 'tooltip' }"
            :title="$t('settings.choose_language')"
            class="pr-8"
            outline
            svg="languages"
            :label="`${
              $i18n.locales.find(({ code }) => code == $i18n.locale).name
            }`"
          />
        </span>
      </template>
      <NuxtLink
        v-for="(locale, index) in $i18n.locales.filter(
          ({ code }) => code !== $i18n.locale
        )"
        :key="`locale-${String(index)}`"
        :to="switchLocalePath(locale.code)"
        @click="$refs.language.tippy().hide()"
      >
        <SmartItem :label="locale.name" />
      </NuxtLink>
    </tippy>
  </span>
</template>
