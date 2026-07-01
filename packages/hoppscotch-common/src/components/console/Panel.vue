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
        :entry="entry"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import { useI18n } from "~/composables/i18n"
import { useColorMode } from "~/composables/theming"

export type ConsoleEntryType =
  | "log"
  | "warn"
  | "info"
  | "error"
  | "debug"
  | "trace"
  | "count"
  | "timeEnd"
  | "timeLog"
  | "group"
  | "groupEnd"
  | "clear"
  | "assert"
  | "dir"
  | "table"

export type ConsoleEntry = {
  type: ConsoleEntryType
  args: unknown[]
  timestamp: number
  collapsed?: boolean
  children?: ConsoleEntry[]
}

const props = defineProps<{
  messages: ConsoleEntry[]
}>()

const colorMode = useColorMode()
const t = useI18n()

const renderedMessages = computed(() => {
  const output: ConsoleEntry[] = []

  const groupStack: ConsoleEntry[] = []
  const appendEntry = (entry: ConsoleEntry) => {
    const currentGroup = groupStack[groupStack.length - 1]

    if (currentGroup) {
      currentGroup.children?.push(entry)
      return
    }

    output.push(entry)
  }

  for (const entry of props.messages) {
    if (entry.type === "clear") {
      output.length = 0
      groupStack.length = 0
      continue
    }

    if (entry.type === "group") {
      const groupEntry: ConsoleEntry = {
        ...entry,
        children: [],
      }

      appendEntry(groupEntry)
      groupStack.push(groupEntry)
      continue
    }

    if (entry.type === "groupEnd") {
      groupStack.pop()
      continue
    }

    appendEntry(entry)
  }

  return output
})
</script>
