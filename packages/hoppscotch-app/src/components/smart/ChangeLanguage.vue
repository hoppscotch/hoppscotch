<template>
  <span class="inline-flex">
    <tippy interactive trigger="click" theme="popover" arrow>
      <span class="select-wrapper">
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :title="t('settings.choose_language')"
          class="pr-8"
          :icon="IconLanguages"
          outline
          :label="currentLocale.name"
        />
      </span>
      <template #content="{ hide }">
        <div
          class="flex flex-col"
          tabindex="0"
          role="menu"
          @keyup.escape="hide()"
        >
          <SmartLink
            v-for="locale in APP_LANGUAGES"
            :key="`locale-${locale.code}`"
            class="flex flex-1"
            @click="
              () => {
                changeLocale(locale.code)
                hide()
              }
            "
          >
            <SmartItem
              :label="locale.name"
              :active-info-icon="currentLocale.code === locale.code"
              :info-icon="currentLocale.code === locale.code ? IconDone : null"
            />
          </SmartLink>
        </div>
      </template>
    </tippy>
  </span>
</template>

<script setup lang="ts">
import { pipe } from "fp-ts/function"
import * as A from "fp-ts/Array"
import * as O from "fp-ts/Option"
import { computed } from "vue"
import { APP_LANGUAGES, FALLBACK_LANG, changeAppLanguage } from "@modules/i18n"
import { useFullI18n } from "@composables/i18n"
import IconLanguages from "~icons/lucide/languages"
import IconDone from "~icons/lucide/check"

// TODO: This component might be completely whack right now

const i18n = useFullI18n()
const t = i18n.t

const currentLocale = computed(() =>
  pipe(
    APP_LANGUAGES,
    A.findFirst(({ code }) => code === i18n.locale.value),
    O.getOrElse(() => FALLBACK_LANG)
  )
)

const changeLocale = (locale: string) => {
  // TODO: Implement
  changeAppLanguage(locale)
}
</script>
