<template>
  <span class="flex flex-1 items-center space-x-2">
    <span class="block truncate">
      {{ dateTimeText }}
    </span>
    <icon-lucide-chevron-right class="flex flex-shrink-0" />
    <span
      class="flex flex-shrink-0 truncate rounded-md border border-dividerDark px-1 text-tiny font-semibold"
      :class="entryStatus.className"
    >
      {{ historyEntry.request.method }}
    </span>
    <span class="block truncate">
      {{ historyEntry.request.endpoint }}
    </span>
  </span>
</template>

<script setup lang="ts">
import { computed } from "vue"
import findStatusGroup from "~/helpers/findStatusGroup"
import { shortDateTime } from "~/helpers/utils/date"
import { RESTHistoryEntry } from "~/newstore/history"

const props = defineProps<{
  historyEntry: RESTHistoryEntry
}>()

const dateTimeText = computed(() =>
  shortDateTime(props.historyEntry.updatedOn!)
)

const entryStatus = computed(() => {
  const foundStatusGroup = findStatusGroup(
    props.historyEntry.responseMeta.statusCode
  )
  return (
    foundStatusGroup || {
      className: "",
    }
  )
})
</script>
