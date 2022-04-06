<template>
  <div>
    <div class="z-10 sticky top-0 border-b bg-primary border-dividerLight mb-5">
      <label for="log" class="py-2 font-semibold text-secondaryLight">{{
        title
      }}</label>
    </div>
    <div v-for="(entry, index) in log" :key="`entry-${index}`">
      <LogEntry v-if="entry" :entry="entry" />
    </div>
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
