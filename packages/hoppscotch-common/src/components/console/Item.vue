<template>
  <div>
    <div class="console-entry-wrapper group" :class="[color, hoverClass]">
      <button
        v-if="isGroup && hasChildren"
        type="button"
        class="mr-2 shrink-0"
        aria-label="Toggle console group"
        :aria-expanded="!isCollapsed"
        @click="toggleGroup"
      >
        <component
          :is="isCollapsed ? IconChevronRight : IconChevronDown"
          class="svg-icons"
        />
      </button>
      <component v-else :is="icon" class="mr-2 shrink-0 svg-icons" />

      <div class="flex flex-col space-y-2 text-xs flex-1 min-w-0">
        <div class="text-secondary">{{ formattedTimestamp }}</div>

        <div class="flex flex-col space-y-1">
          <ConsoleValue
            v-for="(arg, idx) in displayArgs"
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

    <div
      v-if="isGroup && !isCollapsed && hasChildren"
      class="ml-6 mt-2 space-y-2 border-l border-dividerLight pl-3"
    >
      <ConsoleItem
        v-for="(child, index) in entry.children"
        :key="index"
        :entry="child"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue"
import { refAutoReset } from "@vueuse/core"

import IconAlertCircle from "~icons/lucide/alert-circle"
import IconAlertTriangle from "~icons/lucide/alert-triangle"
import IconBug from "~icons/lucide/bug"
import IconInfo from "~icons/lucide/info"
import IconTerminal from "~icons/lucide/terminal"
import IconChevronDown from "~icons/lucide/chevron-down"
import IconChevronRight from "~icons/lucide/chevron-right"
import IconClock from "~icons/lucide/clock"
import IconCopy from "~icons/lucide/copy"
import IconCheck from "~icons/lucide/check"
import IconFolder from "~icons/lucide/folder"
import IconHash from "~icons/lucide/hash"
import IconTable from "~icons/lucide/table"

import type { ConsoleEntry, ConsoleEntryType } from "./Panel.vue"
import { useI18n } from "@composables/i18n"
import { copyToClipboard } from "@helpers/utils/clipboard"
import { useToast } from "@composables/toast"

defineOptions({
  name: "ConsoleItem",
})

type LogLevelsWithBgColor = "info" | "warn" | "error" | "assert"

const props = defineProps<{
  entry: ConsoleEntry
}>()

const t = useI18n()
const toast = useToast()
const copyIcon = refAutoReset(IconCopy, 1000)

const bgColors: Pick<Record<ConsoleEntryType, string>, LogLevelsWithBgColor> = {
  info: "bg-bannerInfo",
  warn: "bg-bannerWarning",
  error: "bg-bannerError",
  assert: "bg-bannerError",
}

const icons: Partial<Record<ConsoleEntryType, unknown>> = {
  info: IconInfo,
  warn: IconAlertCircle,
  error: IconAlertTriangle,
  log: IconTerminal,
  debug: IconBug,
  trace: IconBug,
  count: IconHash,
  timeEnd: IconClock,
  timeLog: IconClock,
  group: IconFolder,
  assert: IconAlertTriangle,
  dir: IconTerminal,
  table: IconTable,
}

const color = computed(() => bgColors[props.entry.type as LogLevelsWithBgColor])
const icon = computed(() => icons[props.entry.type] ?? IconTerminal)

// Only apply hover background for entries without semantic backgrounds (log, debug)
const hoverClass = computed(() =>
  color.value ? "" : "hover:bg-primaryLight"
)

const isGroup = computed(() => props.entry.type === "group")
const hasChildren = computed(() => Boolean(props.entry.children?.length))
const userCollapsed = ref<boolean | null>(null)
const isCollapsed = computed(
  () => userCollapsed.value ?? (props.entry.collapsed === true)
)

const formattedTimestamp = computed(() => {
  const dateEntry = new Date(props.entry.timestamp)
  return dateEntry.toLocaleTimeString()
})

const sanitizeArg = (arg: unknown): unknown =>
  typeof arg === "bigint" ? `${arg}n` : arg

const sanitizedArgs = computed(() => props.entry.args.map(sanitizeArg))

const displayArgs = computed(() => {
  if (isGroup.value && sanitizedArgs.value.length === 0) {
    return [props.entry.collapsed ? "console.groupCollapsed" : "console.group"]
  }

  return sanitizedArgs.value
})

const toggleGroup = () => {
  if (hasChildren.value) {
    userCollapsed.value = !isCollapsed.value
  }
}

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
  const content = displayArgs.value.map(serializeConsoleValue).join(" ")

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
