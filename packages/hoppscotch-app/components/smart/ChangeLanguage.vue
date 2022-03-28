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
      <div class="flex flex-col" role="menu">
        <NuxtLink
          v-for="(locale, index) in $i18n.locales"
          :key="`locale-${index}`"
          :to="switchLocalePath(locale.code)"
          @click="language.tippy().hide()"
        >
          <SmartItem
            :label="locale.name"
            :active-info-icon="$i18n.locale === locale.code"
            :info-icon="$i18n.locale === locale.code ? 'done' : null"
          />
        </NuxtLink>
      </div>
    </tippy>
  </span>
</template>

<script setup lang="ts">
import { ref } from "@nuxtjs/composition-api"

const language = ref<any | null>(null)
</script>
