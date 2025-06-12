<template>
  <div class="overflow-y-auto">
    <div
      class="truncate font-semibold text-secondaryLight border-b border-dividerLight px-4 py-2"
    >
      {{ t("app_console.entries") }}
    </div>

    <HoppSmartPlaceholder
      v-if="renderedMessages.length === 0"
      :src="`/images/states/${colorMode.value}/validation.svg`"
      :alt="t('app.console.no_entries')"
      :heading="t('app_console.no_entries')"
    >
    </HoppSmartPlaceholder>

    <div v-else class="px-4 py-3 space-y-2">
      <ConsoleItem
        v-for="(entry, index) in renderedMessages"
        :key="index"
        :entry="entry"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import { useI18n } from "~/composables/i18n"
import { useColorMode } from "~/composables/theming"

export type ConsoleLogLevel = "log" | "warn" | "info" | "error" | "debug"

export type ConsoleEntry = {
  type: ConsoleLogLevel
  args: unknown[]
  timestamp: number
}

const props = defineProps<{
  messages: ConsoleEntry[]
}>()

const colorMode = useColorMode()
const t = useI18n()

// Filter out "clear" and compute final list to show (simulate console.clear)
const renderedMessages = computed(() => {
  const output: ConsoleEntry[] = []
  for (const entry of props.messages) {
    output.push(entry)
  }
  return output
})
</script>
