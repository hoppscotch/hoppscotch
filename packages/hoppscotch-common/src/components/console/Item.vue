<template>
  <div
    class="flex items-start px-4 py-2 text-tiny text-secondaryDark rounded-md"
    :class="color"
  >
    <component :is="icon" class="mr-2 shrink-0 svg-icons" />

    <div class="flex flex-col space-y-2 overflow-x-auto text-xs flex-1">
      <div class="text-secondary">{{ formattedTimestamp }}</div>

      <div class="flex flex-col space-y-1">
        <ConsoleValue
          v-for="(arg, idx) in entry.args"
          :key="idx"
          :value="arg"
          class="overflow-auto"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue"

import IconAlertCircle from "~icons/lucide/alert-circle"
import IconAlertTriangle from "~icons/lucide/alert-triangle"
import IconBug from "~icons/lucide/bug"
import IconInfo from "~icons/lucide/info"
import IconTerminal from "~icons/lucide/terminal"

import { ConsoleEntry, ConsoleLogLevel } from "./Panel.vue"

type LogLevelsWithBgColor = "info" | "warn" | "error"

const props = defineProps<{
  entry: ConsoleEntry
}>()

const bgColors: Pick<Record<ConsoleLogLevel, string>, LogLevelsWithBgColor> = {
  info: "bg-bannerInfo",
  warn: "bg-bannerWarning",
  error: "bg-bannerError",
}

const icons: Record<ConsoleLogLevel, unknown> = {
  info: IconInfo,
  warn: IconAlertCircle,
  error: IconAlertTriangle,
  log: IconTerminal,
  debug: IconBug,
}

const color = computed(() => bgColors[props.entry.type as LogLevelsWithBgColor])
const icon = computed(() => icons[props.entry.type])

const formattedTimestamp = computed(() => {
  const dateEntry = new Date(props.entry.timestamp)
  return dateEntry.toLocaleTimeString()
})
</script>
