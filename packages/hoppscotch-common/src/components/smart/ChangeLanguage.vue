<template>
  <span class="inline-flex">
    <tippy
      interactive
      trigger="click"
      theme="popover"
      :on-shown="() => tippyActions.focus()"
    >
      <span class="select-wrapper">
        <HoppButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :title="t('settings.choose_language')"
          class="pr-8"
          :icon="IconLanguages"
          outline
          :label="currentLocale.name"
        />
      </span>
      <template #content="{ hide }">
        <div class="flex flex-col space-y-2">
          <div class="sticky z-10 top-0 flex-shrink-0 overflow-x-auto">
            <input
              v-model="searchQuery"
              type="search"
              autocomplete="off"
              class="flex w-full p-4 py-2 input !bg-primaryContrast"
              :placeholder="`${t('action.search')}`"
            />
          </div>
          <div
            ref="tippyActions"
            class="flex flex-col focus:outline-none"
            tabindex="0"
            @keyup.escape="hide()"
          >
            <HoppSmartLink
              v-for="locale in filteredAppLanguages"
              :key="`locale-${locale.code}`"
              class="flex flex-1"
              @click="
                () => {
                  changeLocale(locale.code)
                  hide()
                }
              "
            >
              <HoppSmartItem
                :label="locale.name"
                :active-info-icon="currentLocale.code === locale.code"
                :info-icon="
                  currentLocale.code === locale.code ? IconDone : null
                "
              />
            </HoppSmartLink>
            <HoppSmartPlaceholder
              v-if="
                !(
                  filteredAppLanguages.length !== 0 ||
                  APP_LANGUAGES.length === 0
                )
              "
              :text="`${t('state.nothing_found')} ‟${searchQuery}”`"
            >
              <template #icon>
                <icon-lucide-search class="pb-2 opacity-75 svg-icons" />
              </template>
            </HoppSmartPlaceholder>
          </div>
        </div>
      </template>
    </tippy>
  </span>
</template>

<script setup lang="ts">
import { pipe } from "fp-ts/function"
import * as A from "fp-ts/Array"
import * as O from "fp-ts/Option"
import { computed, ref } from "vue"
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

// Template refs
const tippyActions = ref<any | null>(null)
const searchQuery = ref("")

const filteredAppLanguages = computed(() => {
  return APP_LANGUAGES.filter((obj) =>
    Object.values(obj).some((val) =>
      val.toLowerCase().includes(searchQuery.value.toLowerCase())
    )
  )
})
</script>
