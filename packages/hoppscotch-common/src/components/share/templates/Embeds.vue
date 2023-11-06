<template>
  <div
    class="flex flex-col rounded border border-dotted border-divider p-5"
    :class="{
      'bg-accentContrast': embedOptions.theme === 'light',
    }"
  >
    <div
      class="flex items-stretch space-x-4 rounded border-divider"
      :class="{
        'bg-accentContrast': embedOptions.theme === 'light',
      }"
    >
      <span
        class="flex flex-1 items-center justify-center rounded border border-divider px-3 py-2"
        :class="{
          '!border-dividerLight bg-accentContrast text-primary':
            embedOptions.theme === 'light',
        }"
      >
        {{ method }}
      </span>
      <span
        class="max-w-40 flex items-center rounded border border-divider p-2"
      >
        <span
          class="min-w-0 truncate"
          :class="{
            'text-primary': embedOptions.theme === 'light',
          }"
        >
          {{ endpoint }}
        </span>
      </span>
      <button
        class="flex items-center justify-center rounded border border-dividerDark bg-primaryDark px-3 py-2 font-semibold text-secondary"
        :class="{
          'bg-accentContrast text-primary': embedOptions.theme === 'light',
        }"
      >
        {{ t("action.send") }}
      </button>
    </div>
    <div
      class="flex border-divider"
      :class="{
        'bg-accentContrast text-primary': embedOptions.theme === 'light',
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
</script>
