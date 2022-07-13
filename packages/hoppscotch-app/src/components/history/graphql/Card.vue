<template>
  <div class="flex flex-col group">
    <div class="flex items-center">
      <span
        class="flex flex-1 min-w-0 py-2 pl-4 pr-2 cursor-pointer transition group-hover:text-secondaryDark"
        data-testid="restore_history_entry"
        @click="useEntry"
      >
        <span class="truncate">
          {{ entry.request.url }}
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
        :svg="IconTrash"
        color="red"
        :title="t('action.remove')"
        class="hidden group-hover:inline-flex"
        data-testid="delete_history_entry"
        @click.native="$emit('delete-entry')"
      />
      <ButtonSecondary
        v-tippy="{ theme: 'tooltip' }"
        :title="expand ? t('hide.more') : t('show.more')"
        :svg="expand ? IconMinimize2 : IconMaximize2"
        class="hidden group-hover:inline-flex"
        @click.native="expand = !expand"
      />
      <ButtonSecondary
        v-tippy="{ theme: 'tooltip' }"
        :title="!entry.star ? t('add.star') : t('remove.star')"
        :svg="entry.star ? IconStarSolid : IconStar"
        color="yellow"
        :class="{ 'group-hover:inline-flex hidden': !entry.star }"
        data-testid="star_button"
        @click.native="$emit('toggle-star')"
      />
    </div>
    <div class="flex flex-col text-tiny">
      <span
        v-for="(line, index) in query"
        :key="`line-${index}`"
        class="px-4 font-mono truncate whitespace-pre cursor-pointer text-secondaryLight"
        data-testid="restore_history_entry"
        @click="useEntry"
        >{{ line }}</span
      >
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue"
import { makeGQLRequest } from "@hoppscotch/data"
import { cloneDeep } from "lodash"
import { setGQLSession } from "~/newstore/GQLSession"
import { GQLHistoryEntry } from "~/newstore/history"

import IconStarSolid from "~icons/ic/sharp-star"
import IconStar from "~icons/ic/sharp-star-border"
import IconTrash from "~icons/lucide/trash"
import IconMinimize2 from "~icons/lucide/minimize-2"
import IconMaximize2 from "~icons/lucide/maximize-2"

import { useI18n } from "@composables/i18n"

const t = useI18n()

const props = defineProps<{
  entry: GQLHistoryEntry
  showMore: Boolean
}>()

const expand = ref(false)

const query = computed(() =>
  expand.value
    ? (props.entry.request.query.split("\n") as string[])
    : (props.entry.request.query
        .split("\n")
        .slice(0, 2)
        .concat(["..."]) as string[])
)

const useEntry = () => {
  setGQLSession({
    request: cloneDeep(
      makeGQLRequest({
        name: props.entry.request.name,
        url: props.entry.request.url,
        headers: props.entry.request.headers,
        query: props.entry.request.query,
        variables: props.entry.request.variables,
        auth: props.entry.request.auth,
      })
    ),
    schema: "",
    response: props.entry.response,
  })
}
</script>
