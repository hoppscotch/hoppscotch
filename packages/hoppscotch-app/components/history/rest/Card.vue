<template>
  <div class="flex items-stretch group">
    <span
      v-tippy="{ theme: 'tooltip', delay: [500, 20] }"
      class="flex items-center justify-center w-16 px-2 truncate cursor-pointer"
      :class="entryStatus.className"
      data-testid="restore_history_entry"
      :title="`${duration}`"
      @click="$emit('use-entry')"
    >
      {{ entry.request.method }}
    </span>
    <span
      class="flex flex-1 min-w-0 py-2 pr-2 cursor-pointer transition group-hover:text-secondaryDark"
      data-testid="restore_history_entry"
      @click="$emit('use-entry')"
    >
      <span class="truncate">
        {{ entry.request.endpoint }}
      </span>
      <tippy
        v-if="entry.updatedOn"
        theme="tooltip"
        :delay="[500, 20]"
        :content="`${new Date(entry.updatedOn).toLocaleString()}`"
      />
    </span>
    <ButtonSecondary
      v-tippy="{ theme: 'tooltip' }"
      svg="trash"
      color="red"
      :title="$t('action.remove')"
      class="hidden group-hover:inline-flex"
      data-testid="delete_history_entry"
      @click.native="$emit('delete-entry')"
    />
    <ButtonSecondary
      v-tippy="{ theme: 'tooltip' }"
      :title="!entry.star ? $t('add.star') : $t('remove.star')"
      :class="{ 'group-hover:inline-flex hidden': !entry.star }"
      :svg="entry.star ? 'star-solid' : 'star'"
      color="yellow"
      data-testid="star_button"
      @click.native="$emit('toggle-star')"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from "@nuxtjs/composition-api"
import findStatusGroup from "~/helpers/findStatusGroup"
import { useI18n } from "~/helpers/utils/composables"
import { RESTHistoryEntry } from "~/newstore/history"

const props = defineProps<{
  entry: RESTHistoryEntry
  showMore: Boolean
}>()

const t = useI18n()

const duration = computed(() => {
  if (props.entry.responseMeta.duration) {
    const responseDuration = props.entry.responseMeta.duration
    if (!responseDuration) return ""

    return responseDuration > 0
      ? `${t("request.duration")}: ${responseDuration}ms`
      : t("error.no_duration")
  } else return t("error.no_duration")
})

const entryStatus = computed(() => {
  const foundStatusGroup = findStatusGroup(props.entry.responseMeta.statusCode)
  return (
    foundStatusGroup || {
      className: "",
    }
  )
})
</script>
