<template>
  <div class="group flex flex-col">
    <div class="flex items-center">
      <span
        v-tippy="{
          theme: 'tooltip',
          delay: [500, 20],
          content: entry.updatedOn ? shortDateTime(entry.updatedOn) : null,
        }"
        class="flex min-w-0 flex-1 cursor-pointer py-2 pl-4 pr-2 transition group-hover:text-secondaryDark"
        data-testid="restore_history_entry"
        @click="useEntry"
      >
        <span class="truncate">
          {{ getEntryDisplayName() }}
        </span>
      </span>
      <HoppButtonSecondary
        v-tippy="{ theme: 'tooltip' }"
        :icon="IconTrash"
        color="red"
        :title="t('action.remove')"
        class="hidden group-hover:inline-flex"
        data-testid="delete_history_entry"
        @click="emit('delete-entry')"
      />
      <HoppButtonSecondary
        v-tippy="{ theme: 'tooltip' }"
        :title="expand ? t('hide.more') : t('show.more')"
        :icon="expand ? IconMinimize2 : IconMaximize2"
        class="hidden group-hover:inline-flex"
        @click="expand = !expand"
      />
      <HoppButtonSecondary
        v-tippy="{ theme: 'tooltip' }"
        :title="!entry.star ? t('add.star') : t('remove.star')"
        :icon="entry.star ? IconStarOff : IconStar"
        color="yellow"
        :class="{ 'hidden group-hover:inline-flex': !entry.star }"
        data-testid="star_button"
        @click="emit('toggle-star')"
      />
    </div>
    <div v-if="expand" class="flex flex-col text-tiny px-4 pb-2 space-y-1">
      <div class="text-secondaryLight">
        <span class="font-semibold">Transport:</span>
        {{ entry.request.transportType }}
      </div>
      <div v-if="entry.request.method.methodName" class="text-secondaryLight">
        <span class="font-semibold">Method:</span>
        {{ entry.request.method.methodType }} -
        {{ entry.request.method.methodName }}
      </div>
      <div v-if="entry.request.httpConfig" class="text-secondaryLight truncate">
        <span class="font-semibold">URL:</span>
        {{ entry.request.httpConfig.url }}
      </div>
      <div
        v-if="entry.request.stdioConfig"
        class="text-secondaryLight truncate"
      >
        <span class="font-semibold">Command:</span>
        {{ entry.request.stdioConfig.command }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue"
import { MCPHistoryEntry } from "~/newstore/history"
import { shortDateTime } from "~/helpers/utils/date"

import IconStar from "~icons/lucide/star"
import IconStarOff from "~icons/hopp/star-off"
import IconTrash from "~icons/lucide/trash"
import IconMinimize2 from "~icons/lucide/minimize-2"
import IconMaximize2 from "~icons/lucide/maximize-2"

import { useI18n } from "@composables/i18n"

const t = useI18n()

const props = defineProps<{
  entry: MCPHistoryEntry
  showMore: boolean
}>()

const emit = defineEmits<{
  (e: "delete-entry"): void
  (e: "toggle-star"): void
}>()

const expand = ref(false)

const getEntryDisplayName = () => {
  const { request } = props.entry

  if (request.name && request.name !== "Untitled MCP Request") {
    return request.name
  }

  if (request.method.methodName) {
    return `${request.method.methodType}: ${request.method.methodName}`
  }

  if (request.httpConfig?.url) {
    return request.httpConfig.url
  }

  if (request.stdioConfig?.command) {
    return request.stdioConfig.command
  }

  return "MCP Request"
}

const useEntry = () => {
  // TODO: Implement loading the request into the current session
  // This would require updating the MCP session store with the history entry
  console.log("Load MCP history entry:", props.entry)
}
</script>
