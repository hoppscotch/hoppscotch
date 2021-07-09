<template>
  <div class="flex flex-col group">
    <div class="flex items-center">
      <span
        class="
          py-3
          cursor-pointer
          pr-2
          pl-4
          flex flex-1
          min-w-0
          text-xs
          group-hover:text-secondaryDark
          transition
        "
        data-testid="restore_history_entry"
        @click="$emit('use-entry')"
      >
        <span class="truncate">
          {{ entry.url }}
        </span>
      </span>
      <ButtonSecondary
        v-tippy="{ theme: 'tooltip' }"
        icon="delete"
        :title="$t('delete')"
        class="group-hover:inline-flex hidden"
        color="red"
        data-testid="delete_history_entry"
        @click.native="$emit('delete-entry')"
      />
      <ButtonSecondary
        v-tippy="{ theme: 'tooltip' }"
        :title="expand ? $t('hide_more') : $t('show_more')"
        :icon="expand ? 'unfold_less' : 'unfold_more'"
        class="group-hover:inline-flex hidden"
        @click.native="expand = !expand"
      />
      <ButtonSecondary
        v-tippy="{ theme: 'tooltip' }"
        :title="!entry.star ? $t('add_star') : $t('remove_star')"
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
        class="
          text-xs
          cursor-pointer
          truncate
          px-4
          font-mono
          text-secondaryLight
        "
        data-testid="restore_history_entry"
        @click="$emit('use-entry')"
      >
        {{ line }}
      </span>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    entry: { type: Object, default: () => {} },
    showMore: Boolean,
  },
  data() {
    return {
      expand: false,
    }
  },
  computed: {
    query() {
      return this.expand
        ? this.entry.query.split("\n")
        : this.entry.query.split("\n").slice(0, 2).concat(["..."])
    },
  },
}
</script>
