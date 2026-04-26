<template>
  <div>
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
        :entry="entry.entry"
        :indent="entry.indent"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import { useI18n } from "~/composables/i18n"
import { useColorMode } from "~/composables/theming"

export type ConsoleLogLevel = "log" | "warn" | "info" | "error" | "debug"

export type ConsoleEntryType =
  | ConsoleLogLevel
  | "group"
  | "groupCollapsed"
  | "groupEnd"
  | "table"
  | "dir"
  | "count"
  | "time"
  | "timeEnd"
  | "timeLog"
  | "assert"
  | "clear"

export type ConsoleEntry = {
  type: ConsoleEntryType
  args: unknown[]
  timestamp: number
}

const props = defineProps<{
  messages: ConsoleEntry[]
}>()

const colorMode = useColorMode()
const t = useI18n()

// Compute rendered messages with indentation levels derived from group/groupEnd entries
const renderedMessages = computed(() => {
  const output: { entry: ConsoleEntry; indent: number }[] = []
  let depth = 0
  for (const entry of props.messages) {
    if (entry.type === "groupEnd") {
      depth = Math.max(0, depth - 1)
      output.push({ entry, indent: depth })
    } else if (entry.type === "group" || entry.type === "groupCollapsed") {
      output.push({ entry, indent: depth })
      depth++
    } else {
      output.push({ entry, indent: depth })
    }
  }
  return output
})
</script>
