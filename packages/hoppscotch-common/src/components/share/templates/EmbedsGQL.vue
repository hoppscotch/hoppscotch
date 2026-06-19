<template>
  <div
    class="flex flex-col p-4 border rounded border-dividerDark"
    :class="embedColours"
  >
    <div class="flex items-stretch space-x-2">
      <span
        class="flex items-center flex-1 min-w-0 border rounded"
        :class="embedColours"
      >
        <span
          class="flex w-16 rounded-l h-full items-center justify-center border-r flex-shrink-0"
          :class="embedColours"
        >
          <component :is="IconGraphql" class="h-4 w-4" />
        </span>
        <span class="flex-1 min-w-0 px-3 truncate">
          {{ url }}
        </span>
      </span>
      <button
        class="flex items-center justify-center flex-shrink-0 px-3 py-2 font-semibold border rounded"
        :class="embedColours"
      >
        {{ t("request.run") }}
      </button>
    </div>
    <div
      class="flex overflow-x-scroll"
      :class="[{ 'border-b pt-2': !noActiveTab }, embedColours]"
    >
      <span
        v-for="option in embedOptions.tabs"
        v-show="option.enabled"
        :key="option.value"
        class="p-2"
        :class="[
          {
            'border-b':
              embedOptions.tabs.filter((tab) => tab.enabled)[0]?.value ===
              option.value,
          },
          embedColours,
        ]"
      >
        {{ t(option.label) }}
      </span>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { usePreferredDark, useVModel } from "@vueuse/core"
import { computed } from "vue"

import { useI18n } from "~/composables/i18n"
import IconGraphql from "~icons/hopp/graphql"

// Mirrors share/templates/Embeds.vue but for GraphQL: a single URL bar with
// the Hopp GraphQL icon instead of an HTTP method, and a Run button instead
// of Send. Tabs come from the parent CustomizeGQLModal so the toggles match
// the eventual embed surface 1:1.
type Tabs = "query" | "variables" | "headers" | "authorization"

type EmbedOption = {
  selectedTab: Tabs
  tabs: {
    value: Tabs
    label: string
    enabled: boolean
  }[]
  theme: "light" | "dark" | "system"
}

const props = defineProps<{
  url: string | undefined
  modelValue: EmbedOption
}>()

const embedOptions = useVModel(props, "modelValue")

const t = useI18n()

const noActiveTab = computed(() =>
  embedOptions.value.tabs.every((tab) => !tab.enabled)
)

const systemPrefersDark = usePreferredDark()

const embedColours = computed(() => {
  const { theme } = embedOptions.value

  const darkThemeClasses = "bg-dark-800 text-white !border-dark-50"
  const lightThemeClasses = "bg-white text-black !border-white-50"

  const colorThemeMap = {
    light: lightThemeClasses,
    dark: darkThemeClasses,
    system: systemPrefersDark.value ? darkThemeClasses : lightThemeClasses,
  }

  return colorThemeMap[theme]
})
</script>
