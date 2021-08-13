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
          {{ entry.url }}
        </span>
      </span>
      <ButtonSecondary
        v-tippy="{ theme: 'tooltip' }"
        icon="delete"
        color="red"
        :title="$t('delete')"
        class="hidden group-hover:inline-flex"
        data-testid="delete_history_entry"
        @click.native="$emit('delete-entry')"
      />
      <ButtonSecondary
        v-tippy="{ theme: 'tooltip' }"
        :title="expand ? $t('hide.more') : $t('show.more')"
        :icon="expand ? 'unfold_less' : 'unfold_more'"
        class="hidden group-hover:inline-flex"
        @click.native="expand = !expand"
      />
      <ButtonSecondary
        v-tippy="{ theme: 'tooltip' }"
        :title="!entry.star ? $t('add.star') : $t('remove.star')"
        :icon="entry.star ? 'star' : 'star_border'"
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
import { computed, defineComponent, ref } from "@nuxtjs/composition-api"
import { setGQLSession } from "~/newstore/GQLSession"

// TODO: Concrete entry data type

export default defineComponent({
  props: {
    entry: { type: Object, default: () => {} },
    showMore: Boolean,
  },
  setup(props) {
    const expand = ref(false)

    const query = computed(() =>
      expand
        ? (props.entry.query.split("\n") as string[])
        : (props.entry.query
            .split("\n")
            .slice(0, 2)
            .concat(["..."]) as string[])
    )

    const useEntry = () => {
      setGQLSession({
        name: "",
        url: props.entry.url,
        headers: props.entry.headers,
        response: props.entry.response,
        schema: "",
        query: props.entry.query,
        variables: props.entry.variables,
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
