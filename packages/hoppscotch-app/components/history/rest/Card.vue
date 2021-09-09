<template>
  <div class="flex items-center group">
    <span
      class="cursor-pointer flex px-2 w-16 justify-center items-center truncate"
      :class="entryStatus.className"
      data-testid="restore_history_entry"
      :title="duration"
      @click="$emit('use-entry')"
    >
      {{ entry.request.method }}
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
import {
  computed,
  defineComponent,
  PropType,
  useContext,
} from "@nuxtjs/composition-api"
import findStatusGroup from "~/helpers/findStatusGroup"
import { RESTHistoryEntry } from "~/newstore/history"

export default defineComponent({
  props: {
    entry: { type: Object as PropType<RESTHistoryEntry>, default: () => {} },
    showMore: Boolean,
  },
  setup(props) {
    const {
      app: { i18n },
    } = useContext()
    const $t = i18n.t.bind(i18n)

    const duration = computed(() => {
      if (props.entry.responseMeta.duration) {
        const responseDuration = props.entry.responseMeta.duration
        if (!responseDuration) return ""

        return responseDuration > 0
          ? `${$t("request.duration").toString()}: ${responseDuration}ms`
          : $t("error.no_duration").toString()
      } else return $t("error.no_duration").toString()
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
