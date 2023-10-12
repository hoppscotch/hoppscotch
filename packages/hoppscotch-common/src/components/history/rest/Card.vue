<template>
  <div
    class="flex items-stretch group"
    @contextmenu.prevent="options!.tippy.show()"
  >
    <span
      v-tippy="{ theme: 'tooltip', delay: [500, 20] }"
      class="flex items-center justify-center w-16 px-2 truncate cursor-pointer"
      :class="entryStatus.className"
      data-testid="restore_history_entry"
      :title="`${duration}`"
      @click="emit('use-entry')"
    >
      <span class="font-semibold truncate text-tiny">
        {{ entry.request.method }}
      </span>
    </span>
    <span
      v-tippy="{
        theme: 'tooltip',
        delay: [500, 20],
        content: entry.updatedOn ? shortDateTime(entry.updatedOn) : null,
      }"
      class="flex flex-1 min-w-0 py-2 pr-2 cursor-pointer transition group-hover:text-secondaryDark"
      data-testid="restore_history_entry"
      @click="emit('use-entry')"
    >
      <span class="truncate">
        {{ entry.request.endpoint }}
      </span>
    </span>
    <span>
      <tippy
        ref="options"
        interactive
        trigger="click"
        theme="popover"
        :on-shown="() => tippyActions!.focus()"
      >
        <template #content="{ hide }">
          <div
            ref="tippyActions"
            class="flex flex-col focus:outline-none"
            tabindex="0"
            role="menu"
            @keyup.s="addToCollectionAction?.$el.click()"
            @keyup.escape="hide()"
          >
            <HoppSmartItem
              ref="addToCollectionAction"
              :icon="IconSave"
              :label="`${t('collection.save_to_collection')}`"
              :shortcut="['S']"
              @click="
                () => {
                  emit('add-to-collection')
                  hide()
                }
              "
            />
          </div>
        </template>
      </tippy>
    </span>
    <HoppButtonSecondary
      v-tippy="{ theme: 'tooltip' }"
      :icon="IconTrash"
      color="red"
      :title="t('action.remove')"
      class="hidden group-hover:inline-flex"
      data-testid="delete_history_entry"
      @click="emit('delete-entry')"
    />
    <HoppButtonSecondary
      v-tippy="{ theme: 'tooltip' }"
      :title="!entry.star ? t('add.star') : t('remove.star')"
      :class="{ 'group-hover:inline-flex hidden': !entry.star }"
      :icon="entry.star ? IconStarOff : IconStar"
      color="yellow"
      data-testid="star_button"
      @click="emit('toggle-star')"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue"
import findStatusGroup from "~/helpers/findStatusGroup"
import { useI18n } from "@composables/i18n"
import { RESTHistoryEntry } from "~/newstore/history"
import { shortDateTime } from "~/helpers/utils/date"
import IconSave from "~icons/lucide/save"
import IconStar from "~icons/lucide/star"
import IconStarOff from "~icons/hopp/star-off"
import IconTrash from "~icons/lucide/trash"
import { TippyComponent } from "vue-tippy"

const props = defineProps<{
  entry: RESTHistoryEntry
  showMore: boolean
}>()

const emit = defineEmits<{
  (e: "use-entry"): void
  (e: "delete-entry"): void
  (e: "toggle-star"): void
  (e: "add-to-collection"): void
}>()

const tippyActions = ref<TippyComponent | null>(null)
const options = ref<TippyComponent | null>(null)
const addToCollectionAction = ref<HTMLButtonElement | null>(null)

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
  const foundStatusGroup = findStatusGroup(props.entry.responseMeta.statusCode)
  return (
    foundStatusGroup || {
      className: "",
    }
  )
})
</script>
