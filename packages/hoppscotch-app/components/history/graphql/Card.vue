<template>
  <div class="flex flex-col group">
    <div class="flex items-center">
      <span
        class="
          cursor-pointer
          flex flex-1
          min-w-0
          py-2
          pr-2
          pl-4
          transition
          group-hover:text-secondaryDark
        "
        data-testid="restore_history_entry"
        @click="useEntry"
      >
        <span class="truncate">
          {{ entry.request.url }}
        </span>
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
        :title="expand ? $t('hide.more') : $t('show.more')"
        :svg="expand ? 'minimize-2' : 'maximize-2'"
        class="hidden group-hover:inline-flex"
        @click.native="expand = !expand"
      />
      <ButtonSecondary
        v-tippy="{ theme: 'tooltip' }"
        :title="!entry.star ? $t('add.star') : $t('remove.star')"
        :svg="entry.star ? 'star-solid' : 'star'"
        color="yellow"
        :class="{ 'group-hover:inline-flex hidden': !entry.star }"
        data-testid="star_button"
        @click.native="$emit('toggle-star')"
      />
    </div>
    <div class="flex flex-col">
      <span
        v-for="(line, index) in query"
        :key="`line-${index}`"
        class="cursor-pointer text-secondaryLight px-4 whitespace-pre truncate"
        data-testid="restore_history_entry"
        @click="useEntry"
        >{{ line }}</span
      >
    </div>
  </div>
</template>

<script lang="ts">
import {
  computed,
  defineComponent,
  PropType,
  ref,
} from "@nuxtjs/composition-api"
import { makeGQLRequest } from "~/helpers/types/HoppGQLRequest"
import { setGQLSession } from "~/newstore/GQLSession"
import { GQLHistoryEntry } from "~/newstore/history"

export default defineComponent({
  props: {
    entry: { type: Object as PropType<GQLHistoryEntry>, default: () => {} },
    showMore: Boolean,
  },
  setup(props) {
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
        request: makeGQLRequest({
          name: props.entry.request.name,
          url: props.entry.request.url,
          headers: props.entry.request.headers,
          query: props.entry.request.query,
          variables: props.entry.request.variables,
        }),
        schema: "",
        response: props.entry.response,
      })
    }

    return {
      expand,
      query,
      useEntry,
    }
  },
})
</script>
