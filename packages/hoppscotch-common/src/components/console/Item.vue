<template>
  <div class="console-entry-wrapper group" :class="[color, hoverClass]">
    <component :is="icon" class="mr-2 shrink-0 svg-icons" />

    <div class="flex flex-col space-y-2 text-xs flex-1 min-w-0">
      <div class="text-secondary">{{ formattedTimestamp }}</div>

      <div class="flex flex-col space-y-1">
        <ConsoleValue
          v-for="(arg, idx) in sanitizedArgs"
          :key="idx"
          :value="arg"
        />
      </div>
    </div>

    <button
      v-tippy="{ theme: 'tooltip' }"
      :title="t('action.copy')"
      :aria-label="t('action.copy')"
      class="ml-2 shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity p-1 hover:bg-dividerLight rounded"
      @click="copyEntry"
    >
      <component :is="copyIcon" class="w-4 h-4 svg-icons" />
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
import { useI18n } from "@composables/i18n"
import { copyToClipboard } from "@helpers/utils/clipboard"
import { useToast } from "@composables/toast"

type LogLevelsWithBgColor = "info" | "warn" | "error"

const props = defineProps<{
  entry: ConsoleEntry
}>()

const t = useI18n()
const toast = useToast()
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

// Only apply hover background for entries without semantic backgrounds (log, debug)
const hoverClass = computed(() =>
  props.entry.type in bgColors ? "" : "hover:bg-primaryLight"
)

const formattedTimestamp = computed(() => {
  const dateEntry = new Date(props.entry.timestamp)
  return dateEntry.toLocaleTimeString()
})

const sanitizeArg = (arg: unknown): unknown =>
  typeof arg === "bigint" ? `${arg}n` : arg

const sanitizedArgs = computed(() => props.entry.args.map(sanitizeArg))

// Serialize value for clipboard copy
const serializeConsoleValue = (value: unknown): string => {
  if (typeof value === "string") return value

  if (typeof value === "number" || typeof value === "boolean")
    return String(value)

  if (value === null) return "null"

  if (value === undefined) return "undefined"

  try {
    const serialized = JSON.stringify(
      value,
      (_key, val) => (typeof val === "bigint" ? `${val}n` : val),
      2
    )
    return serialized !== undefined ? serialized : "[Unserializable]"
  } catch {
    return "[Unserializable]"
  }
}

const copyEntry = () => {
  const content = sanitizedArgs.value.map(serializeConsoleValue).join(" ")

  copyToClipboard(content)
  copyIcon.value = IconCheck
  toast.success(t("state.copied_to_clipboard"))
}
</script>

<style scoped>
.console-entry-wrapper {
  @apply flex items-start px-4 py-2 text-tiny text-secondaryDark rounded-md transition-colors;
}
</style>
