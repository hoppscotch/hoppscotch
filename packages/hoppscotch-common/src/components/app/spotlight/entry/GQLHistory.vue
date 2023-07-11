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
      class="font-semibold truncate text-tiny flex flex-shrink-0 border border-dividerDark rounded-md px-1"
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
