<template>
  <div
    class="group flex items-start px-4 py-2 text-tiny text-secondaryDark rounded-md relative"
    :class="color"
  >
    <component :is="icon" class="mr-2 shrink-0 svg-icons" />

    <div class="flex flex-col space-y-2 overflow-x-auto text-xs flex-1">
      <div class="text-secondary">{{ formattedTimestamp }}</div>

      <div class="flex flex-col space-y-1">
        <ConsoleValue
          v-for="(arg, idx) in sanitizedArgs"
          :key="idx"
          :value="arg"
          class="overflow-auto"
        />
      </div>
    </div>

    <!-- Copy button - appears on hover -->
    <button
      v-tippy="{ theme: 'tooltip' }"
      :title="t('action.copy')"
      class="absolute right-2 top-2 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity bg-primaryLight hover:bg-primaryDark"
      @click="copyEntry"
    >
      <component :is="copyIcon" class="svg-icons w-3.5 h-3.5" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import { refAutoReset } from "@vueuse/core"

import IconAlertCircle from "~icons/lucide/alert-circle"
import IconAlertTriangle from "~icons/lucide/alert-triangle"
import IconBug from "~icons/lucide/bug"
import IconInfo from "~icons/lucide/info"
import IconTerminal from "~icons/lucide/terminal"
import IconCopy from "~icons/lucide/copy"
import IconCheck from "~icons/lucide/check"

import { ConsoleEntry, ConsoleLogLevel } from "./Panel.vue"
import { useI18n } from "~/composables/i18n"
import { copyToClipboard } from "~/helpers/utils/clipboard"

type LogLevelsWithBgColor = "info" | "warn" | "error"

const props = defineProps<{
  entry: ConsoleEntry
}>()

const t = useI18n()
const copyIcon = refAutoReset(IconCopy, 1000)

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

/**
 * Sanitizes an argument (BigInt → string)
 */
const sanitizeArg = (arg: unknown): unknown => {
  if (typeof arg === "bigint") return `${arg}n`
  return arg
}

/**
 * Sanitized args for display and copy
 */
const sanitizedArgs = computed(() => {
  return props.entry.args.map(sanitizeArg)
})

/**
 * Converts a sanitized argument to string for clipboard
 */
const toClipboardString = (arg: unknown): string => {
  if (arg === undefined) return "undefined"

  // String - try to compact if it's JSON
  if (typeof arg === "string") {
    try {
      const parsed = JSON.parse(arg)
      if (typeof parsed === "object" && parsed !== null) {
        return JSON.stringify(parsed)
      }
    } catch {
      // Not valid JSON - fall through
    }
    return arg
  }
  return JSON.stringify(arg)
}

const copyEntry = () => {
  const text = sanitizedArgs.value.map(toClipboardString).join(" ")
  copyToClipboard(text)
  copyIcon.value = IconCheck
}
</script>
