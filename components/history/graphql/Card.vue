<template>
  <div class="flex flex-col group">
    <div class="flex items-center">
      <span
        class="
          cursor-pointer
          flex
          font-semibold
          flex-1
          min-w-0
          py-2
          pr-2
          pl-4
          transition
          group-hover:text-secondaryDark
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
        class="
          cursor-pointer
          font-mono
          text-secondaryLight
          px-4
          whitespace-pre
          truncate
        "
        data-testid="restore_history_entry"
        @click="$emit('use-entry')"
        >{{ line }}</span
      >
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
