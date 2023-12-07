<template>
  <div
    class="flex flex-col p-4 border rounded border-dividerDark"
    :class="{
      'bg-accentContrast': isEmbedThemeLight,
    }"
  >
    <div
      class="flex items-stretch space-x-2"
      :class="{
        'bg-accentContrast': isEmbedThemeLight,
      }"
    >
      <span
        class="flex items-center flex-1 min-w-0 border rounded border-divider"
      >
        <span
          class="flex max-w-[4rem] rounded-l h-full items-center justify-center border-r border-divider text-tiny"
          :class="{
            '!border-dividerLight bg-accentContrast text-primary':
              isEmbedThemeLight,
          }"
        >
          <span class="px-3 truncate">
            {{ method }}
          </span>
        </span>
        <span
          class="px-3 truncate"
          :class="{
            'text-primary': isEmbedThemeLight,
          }"
        >
          {{ endpoint }}
        </span>
      </span>
      <button
        class="flex items-center justify-center flex-shrink-0 px-3 py-2 font-semibold border rounded border-dividerDark bg-primaryDark text-secondary"
        :class="{
          '!bg-accentContrast text-primaryLight': isEmbedThemeLight,
        }"
      >
        {{ t("action.send") }}
      </button>
    </div>
    <div
      class="flex"
      :class="{
        'bg-accentContrast text-primary': isEmbedThemeLight,
        'border-b border-divider pt-2': !noActiveTab,
      }"
    >
      <span
        v-for="option in embedOptions.tabs"
        v-show="option.enabled"
        :key="option.value"
        class="px-2 py-2"
        :class="{
          'border-b border-dividerDark':
            embedOptions.tabs.filter((tab) => tab.enabled)[0]?.value ===
            option.value,
        }"
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

const isEmbedThemeLight = computed(() => embedOptions.value.theme === "light")
</script>
