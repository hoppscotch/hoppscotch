<template>
  <span class="flex flex-1 items-center space-x-2">
    <span class="block truncate">
      {{ dateTimeText }}
    </span>
    <icon-lucide-chevron-right class="flex flex-shrink-0" />
    <span class="block truncate">
      {{ historyEntry.request.url }}
    </span>
    <span
      class="flex flex-shrink-0 truncate rounded-md border border-dividerDark px-1 text-tiny font-semibold"
    >
      {{ historyEntry.request.query.split("\n")[0] }}
    </span>
  </span>
</template>

<script setup lang="ts">
import { computed } from "vue"
import { shortDateTime } from "~/helpers/utils/date"
import { GQLHistoryEntry } from "~/newstore/history"

const props = defineProps<{
  historyEntry: GQLHistoryEntry
}>()

const dateTimeText = computed(() =>
  shortDateTime(props.historyEntry.updatedOn!)
)
</script>
