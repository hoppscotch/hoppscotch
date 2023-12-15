<template>
  <div
    class="flex flex-col p-4 border rounded border-dividerDark"
    :class="[embedColours]"
  >
    <div class="flex items-stretch space-x-2" :class="[embedColours]">
      <span
        class="flex items-center flex-1 min-w-0 border rounded"
        :class="[embedColours]"
      >
        <span
          class="flex max-w-[4rem] rounded-l h-full items-center justify-center border-r text-tiny"
          :class="[embedColours]"
        >
          <span class="px-3 truncate text-xs">
            {{ method }}
          </span>
        </span>
        <span class="px-3 truncate" :class="[embedColours]">
          {{ endpoint }}
        </span>
      </span>
      <button
        class="flex items-center justify-center flex-shrink-0 px-3 py-2 font-semibold border rounded"
        :class="[embedColours]"
      >
        {{ t("action.send") }}
      </button>
    </div>
    <div
      class="flex"
      :class="[{ 'border-b pt-2 ': !noActiveTab }, embedColours]"
    >
      <span
        v-for="option in embedOptions.tabs"
        v-show="option.enabled"
        :key="option.value"
        class="p-2"
        :class="[
          {
            embedColours,
            'border-b ':
              embedOptions.tabs.filter((tab) => tab.enabled)[0]?.value ===
              option.value,
          },
          embedColours,
        ]"
      >
        {{ option.label }}
      </span>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { useVModel } from "@vueuse/core"
import { computed } from "vue"
import { useI18n } from "~/composables/i18n"
import { useSetting } from "~/composables/settings"

type Tabs = "parameters" | "body" | "headers" | "authorization"

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
  method: string | undefined
  endpoint: string | undefined
  modelValue: EmbedOption
}>()

const embedOptions = useVModel(props, "modelValue")

const t = useI18n()

const noActiveTab = computed(() => {
  return embedOptions.value.tabs.every((tab) => !tab.enabled)
})

const systemTheme = useSetting("BG_COLOR")

const embedColours = computed(() => {
  const theme = embedOptions.value.theme

  const darkThemeColours = "bg-dark-800 text-white !border-dark-50"
  const lightThemeColours = "bg-white text-black !border-white-50"

  if (theme === "dark") {
    return darkThemeColours
  } else if (theme === "light") {
    return lightThemeColours
  }
  return systemTheme.value === "light" ? lightThemeColours : darkThemeColours
})
</script>
