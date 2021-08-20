<template>
  <div class="flex items-center group">
    <span
      class="cursor-pointer flex px-2 w-16 justify-center items-center truncate"
      :class="entryStatus.className"
      data-testid="restore_history_entry"
      :title="duration"
      @click="$emit('use-entry')"
    >
      {{ entry.method }}
    </span>
    <span
      class="
        cursor-pointer
        flex flex-1
        min-w-0
        py-2
        pr-2
        transition
        group-hover:text-secondaryDark
      "
      data-testid="restore_history_entry"
      :title="duration"
      @click="$emit('use-entry')"
    >
      <span class="truncate">
        {{ `${entry.endpoint}` }}
      </span>
    </span>
    <ButtonSecondary
      v-tippy="{ theme: 'tooltip' }"
      icon="remove_circle_outline"
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
      :icon="entry.star ? 'star' : 'star_border'"
      color="yellow"
      data-testid="star_button"
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
    duration() {
      if (this.entry.meta.responseDuration) {
        const responseDuration = this.entry.meta.responseDuration
        return responseDuration > 0
          ? `${this.$t("request.duration")}: ${responseDuration}ms`
          : this.$t("error.no_duration")
      } else return this.$t("error.no_duration")
    },
    entryStatus() {
      const foundStatusGroup = findStatusGroup(this.entry.statusCode)
      return (
        foundStatusGroup || {
          className: "",
        }
      )
    },
  },
}
</script>
