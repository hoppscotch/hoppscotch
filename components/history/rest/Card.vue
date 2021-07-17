<template>
  <div class="flex items-center group">
    <span
      class="
        cursor-pointer
        flex
        font-mono font-bold
        mx-2
        text-xs
        w-12
        justify-center
        items-center
        truncate
      "
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
        flex
        font-semibold
        flex-1
        text-xs
        min-w-0
        py-3
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
      icon="delete"
      :title="$t('delete')"
      class="group-hover:inline-flex hidden"
      color="red"
      data-testid="delete_history_entry"
      @click.native="$emit('delete-entry')"
    />
    <ButtonSecondary
      v-tippy="{ theme: 'tooltip' }"
      :title="!entry.star ? $t('add_star') : $t('remove_star')"
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
          ? `${this.$t("duration")}: ${responseDuration}ms`
          : this.$t("no_duration")
      } else return this.$t("no_duration")
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
