<template>
  <span>
    <tippy
      ref="language"
      trigger="click"
      theme="popover"
      arrow
      interactive
      :animate-fill="false"
    >
      <template #trigger>
        <button v-tippy="{ theme: 'tooltip' }" :title="$t('choose_language')">
          <span class="mr-2 text-lg">
            {{
              $i18n.locales.find(({ code }) => code == $i18n.locale).country
                | formatCountry
            }}
          </span>
          {{ $i18n.locales.find(({ code }) => code == $i18n.locale).name }}
        </button>
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
