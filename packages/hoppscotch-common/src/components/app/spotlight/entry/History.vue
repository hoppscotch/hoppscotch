<template>
  <span class="flex flex-row space-x-2">
    <span>{{ dateTimeText }}</span>
    <icon-lucide-chevron-right class="inline" />
    <span class="truncate" :class="entryStatus.className">
      <span class="font-semibold truncate text-tiny">
        {{ historyEntry.request.method }}
      </span>
    </span>
    <span>
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
