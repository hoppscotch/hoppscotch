<template>
  <div
    class="flex flex-col border border-dotted border-divider p-5 rounded"
    :class="{
      'bg-accentContrast': embedOptions.theme === 'light',
    }"
  >
    <div
      class="flex items-stretch rounded border-divider space-x-4"
      :class="{
        'bg-accentContrast': embedOptions.theme === 'light',
      }"
    >
      <span
        class="flex items-center justify-center py-2 px-3 flex-1 rounded border border-divider"
        :class="{
          'bg-accentContrast text-primary !border-dividerLight':
            embedOptions.theme === 'light',
        }"
      >
        {{ method }}
      </span>
      <span
        class="flex items-center p-2 max-w-40 border border-divider rounded"
      >
        <span
          class="truncate min-w-0"
          :class="{
            'text-primary': embedOptions.theme === 'light',
          }"
        >
          {{ endpoint }}
        </span>
      </span>
      <button
        class="flex items-center justify-center bg-primaryDark px-3 py-2 rounded border border-dividerDark text-secondary font-semibold"
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
        'pt-2 border-b ': !noActiveTab,
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
