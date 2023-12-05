<template>
  <div
    class="flex flex-col rounded border border-dotted border-divider p-5"
    :class="{
      'bg-accentContrast': isEmbedThemeLight,
    }"
  >
    <div
      class="flex items-stretch space-x-4 rounded border-divider"
      :class="{
        'bg-accentContrast': isEmbedThemeLight,
      }"
    >
      <span
        class="flex max-w-[4rem] items-center justify-center rounded border border-divider px-1 py-2 text-tiny"
        :class="{
          '!border-dividerLight bg-accentContrast text-primary':
            isEmbedThemeLight,
        }"
      >
        <span class="truncate">
          {{ method }}
        </span>
      </span>
      <span
        class="flex max-w-46 items-center rounded border border-divider p-2"
      >
        <span
          class="min-w-0 truncate"
          :class="{
            'text-primary': isEmbedThemeLight,
          }"
        >
          {{ endpoint }}
        </span>
      </span>
      <button
        class="flex items-center justify-center rounded border border-dividerDark bg-primaryDark px-3 py-2 font-semibold text-secondary"
        :class="{
          '!bg-accentContrast text-primaryLight': isEmbedThemeLight,
        }"
      >
        {{ t("action.send") }}
      </button>
    </div>
    <div
      class="flex border-divider"
      :class="{
        'bg-accentContrast text-primary': isEmbedThemeLight,
        'border-b pt-2 ': !noActiveTab,
      }"
    >
      <span
        v-for="option in embedOptions.tabs"
        v-show="option.enabled"
        :key="option.value"
        class="px-2 py-2"
        :class="{
          'border-b border-dividerDark':
            embedOptions.selectedTab === option.value,
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
