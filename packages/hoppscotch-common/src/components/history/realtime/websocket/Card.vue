<template>
  <div class="flex flex-col group" @click="emit('use-entry')">
    <div class="flex items-center">
      <span
        v-tippy="{
          theme: 'tooltip',
          delay: [500, 20],
          content: entry.updatedOn ? shortDateTime(entry.updatedOn) : null,
        }"
        class="flex flex-col min-w-0 py-2 pl-4 pr-2 cursor-pointer transition group-hover:text-secondaryDark"
        data-testid="restore_history_entry"
      >
        <span
          v-for="(line, index) in payload"
          :key="`line-${index}`"
          class="font-mono truncate whitespace-pre cursor-pointer"
          data-testid="restore_history_entry"
        >
          {{ line }}
        </span>
      </span>
      <span class="flex-grow" />
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
        v-if="hasOverflow"
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
        :class="{ 'group-hover:inline-flex hidden': !entry.star }"
        data-testid="star_button"
        @click="emit('toggle-star')"
      />
    </div>
    <div class="flex flex-col text-tiny text-secondaryLight">
      <span class="px-4 truncate">
        {{ entry.command.url }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue"
import { WSHistoryEntry } from "~/newstore/history"
import { shortDateTime } from "~/helpers/utils/date"

import IconStar from "~icons/lucide/star"
import IconStarOff from "~icons/hopp/star-off"
import IconTrash from "~icons/lucide/trash"
import IconMinimize2 from "~icons/lucide/minimize-2"
import IconMaximize2 from "~icons/lucide/maximize-2"

import { useI18n } from "@composables/i18n"

const t = useI18n()

const props = defineProps<{
  entry: WSHistoryEntry
  showMore: boolean
}>()

const emit = defineEmits<{
  (e: "use-entry"): void
  (e: "delete-entry"): void
  (e: "toggle-star"): void
}>()

const expand = ref(false)

const hasOverflow = computed(() => {
  return props.entry.command.payload.body.split("\n").length > 3
})

const payload = computed(() => {
  const lines = props.entry.command.payload.body.split("\n") as string[]
  return expand.value || !hasOverflow.value
    ? lines
    : (lines.slice(0, 2).concat(["..."]) as string[])
})
</script>
