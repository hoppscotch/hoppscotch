<template>
  <span class="inline-flex">
    <tippy ref="language" interactive trigger="click" theme="popover" arrow>
        <span class="select-wrapper">
          <SmartItem
            v-tippy="{ theme: 'tooltip' }"
            :title="t('settings.choose_language')"
            outline
            :svg="IconLanguages"
            :info-icon="IconChevronDown"
            :label="`${
              i18n.availableLocales.find((locale) => locale === i18n.locale.value)
            }`"
          />
        </span>
      <template #content="{ hide }">
        <div class="flex flex-col" role="menu">
          <SmartLink
            v-for="(locale, index) in i18n.availableLocales"
            :key="`locale-${index}`"
            @click="() => {
              changeLocale(locale);
              hide()
            }"
          >
            <SmartItem
              :label="locale"
              :active-info-icon="i18n.locale.value === locale"
              :info-icon="i18n.locale.value === locale ? IconDone : null"
            />
          </SmartLink>
        </div>
      </template>
    </tippy>
  </span>
</template>

<script setup lang="ts">
import { ref } from "vue"
import { useFullI18n } from "@composables/i18n"
import IconChevronDown from "~icons/lucide/chevron-down"
import IconLanguages from "~icons/lucide/languages"
import IconDone from "~icons/ic/sharp-done"

// TODO: This component might be completely whack right now

const i18n = useFullI18n()
const t = i18n.t

const language = ref<any | null>(null)

const changeLocale = (locale: string) => {
  // TODO: Implement
}
</script>
