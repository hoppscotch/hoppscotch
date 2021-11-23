<template>
  <div class="flex items-center group">
    <span
      class="flex items-center justify-center w-16 px-2 truncate cursor-pointer"
      :class="entryStatus.className"
      data-testid="restore_history_entry"
      :title="`${duration}`"
      @click="$emit('use-entry')"
    >
      {{ entry.request.method }}
    </span>
    <span
      class="
        flex
        group-hover:text-secondaryDark
        flex-1
        min-w-0
        py-2
        pr-2
        transition
        cursor-pointer
      "
      data-testid="restore_history_entry"
      :title="`${duration}`"
      @click="$emit('use-entry')"
    >
      <span class="truncate">
        {{ entry.request.endpoint }}
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
      :title="!entry.star ? $t('add.star') : $t('remove.star')"
      :class="{ 'group-hover:inline-flex hidden': !entry.star }"
      :svg="entry.star ? 'star-solid' : 'star'"
      color="yellow"
      data-testid="star_button"
      @click.native="$emit('toggle-star')"
    />
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, PropType } from "@nuxtjs/composition-api"
import findStatusGroup from "~/helpers/findStatusGroup"
import { useI18n } from "~/helpers/utils/composables"
import { RESTHistoryEntry } from "~/newstore/history"

export default defineComponent({
  props: {
    entry: { type: Object as PropType<RESTHistoryEntry>, default: () => {} },
    showMore: Boolean,
  },
  setup(props) {
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
      const foundStatusGroup = findStatusGroup(
        props.entry.responseMeta.statusCode
      )
      return (
        foundStatusGroup || {
          className: "",
        }
      )
    })

    return {
      duration,
      entryStatus,
    }
  },
})
</script>
