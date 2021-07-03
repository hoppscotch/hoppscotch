<template>
  <span>
    <tippy
      ref="language"
      tabindex="-1"
      trigger="click"
      theme="popover"
      arrow
      interactive
      :animate-fill="false"
    >
      <template #trigger>
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :title="$t('choose_language')"
          :label="$i18n.locales.find(({ code }) => code == $i18n.locale).name"
        />
        {{
          $i18n.locales.find(({ code }) => code == $i18n.locale).country
            | formatCountry
        }}
      </template>
      <NuxtLink
        v-for="locale in $i18n.locales.filter(
          ({ code }) => code !== $i18n.locale
        )"
        :key="locale.code"
        class="
          inline-flex
          items-center
          px-4
          py-2
          transition
          rounded-lg
          hover:bg-accentLight hover:text-secondaryDark
          focus:bg-accentLight focus:text-secondaryDark focus:outline-none
        "
        :to="switchLocalePath(locale.code)"
      >
        <span class="mr-2 text-lg">
          {{ locale.country | formatCountry }}
        </span>
        <span class="font-semibold">
          {{ locale.name }}
        </span>
      </NuxtLink>
    </tippy>
  </span>
</template>
