<template>
  <span class="flex items-center space-x-1">
    <span class="block truncate">
      {{ dateTimeText }}
    </span>
    :
    <span class="block truncate">
      {{ historyEntry.request.url }}
    </span>
    <icon-lucide-chevron-right class="flex flex-shrink-0" />
    <span class="block truncate opacity-60">
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
