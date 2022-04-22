<template>
  <div>
    <div
      class="sticky top-0 z-10 flex items-center justify-between pl-4 border-b bg-primary border-dividerLight"
    >
      <label for="log" class="py-2 font-semibold text-secondaryLight">
        {{ title }}
      </label>
    </div>
    <LogEntry
      v-for="(entry, index) in log"
      :key="`entry-${index}`"
      :entry="entry"
    />
  </div>
</template>

<script setup lang="ts">
import { PropType } from "@nuxtjs/composition-api"
import LogEntry from "./LogEntry.vue"

export type LogEntryData = {
  ts: number
  source: "info" | "client" | "server" | "disconnected"
  payload: string
  event: "connecting" | "connected" | "disconnected" | "error"
}

defineProps({
  log: { type: Array as PropType<LogEntryData[]>, default: () => [] },
  title: {
    type: String,
    default: "",
  },
})
</script>
