<template>
  <div class="flex items-center group">
    <span
      class="
        font-mono font-bold
        flex
        justify-center
        items-center
        text-xs
        w-12
        mx-2
        truncate
        cursor-pointer
      "
      :class="entryStatus.className"
      @click="$emit('use-entry')"
    >
      {{ entry.method }}
    </span>
    <span
      class="
        py-3
        cursor-pointer
        pr-3
        flex flex-1
        min-w-0
        text-xs
        group-hover:text-secondaryDark
        transition
      "
      @click="$emit('use-entry')"
    >
      <span class="truncate">
        {{ `${entry.url}${entry.path}` }}
      </span>
    </span>
    <ButtonSecondary
      v-tippy="{ theme: 'tooltip' }"
      data-testid="delete_history_entry"
      icon="delete"
      :title="$t('delete')"
      class="group-hover:inline-flex hidden"
      color="red"
      @click.native="$emit('delete-entry')"
    />
    <ButtonSecondary
      v-tippy="{ theme: 'tooltip' }"
      :title="!entry.star ? $t('add_star') : $t('remove_star')"
      :class="{ 'group-hover:inline-flex hidden': !entry.star }"
      :icon="entry.star ? 'star' : 'star_border'"
      color="yellow"
      @click.native="$emit('toggle-star')"
    />
  </div>
</template>

<script>
import findStatusGroup from "~/helpers/findStatusGroup"

export default {
  props: {
    entry: { type: Object, default: () => {} },
    showMore: Boolean,
  },
  computed: {
    entryStatus() {
      const foundStatusGroup = findStatusGroup(this.entry.status)
      return (
        foundStatusGroup || {
          className: "",
        }
      )
    },
  },
}
</script>
