<template>
  <div class="flex flex-col">
    <div
      class="flex items-center group"
      draggable="true"
      @click="emit('select-response')"
    >
      <span
        class="cursor-pointer flex px-4 min-w-0 justify-center items-center truncate text-gray-500"
      >
        <IconNote />
      </span>
      <span
        class="cursor-pointer flex flex-1 min-w-0 py-2 pr-2 transition items-center group-hover:text-secondaryDark"
      >
        <span class="truncate">
          {{ request.responses[responseIndex].name }}
        </span>
      </span>
      <div class="flex">
        <span>
          <tippy
            ref="options"
            interactive
            trigger="click"
            theme="popover"
            arrow
          >
            <HoppButtonSecondary
              v-tippy="{ theme: 'tooltip' }"
              :title="`${t('action.more')}`"
              :icon="IconMoreVertical"
            />
            <template #content="{ hide }">
              <div
                ref="tippyActions"
                class="flex flex-col focus:outline-none"
                tabindex="0"
                @keyup.escape="hide()"
              >
                <HoppSmartItem
                  ref="editAction"
                  :icon="IconEdit"
                  :label="`${t('action.rename')}`"
                  @click="
                    () => {
                      emit('edit-response')
                      hide()
                    }
                  "
                />
                <HoppSmartItem
                  ref="deleteAction"
                  :icon="IconTrash2"
                  :label="`${t('action.delete')}`"
                  :shortcut="['⌫']"
                  @click="
                    () => {
                      emit('delete-response')
                      hide()
                    }
                  "
                />
              </div>
            </template>
          </tippy>
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { PropType } from "vue"
import IconMoreVertical from "~icons/lucide/more-vertical"
import IconTrash2 from "~icons/lucide/trash-2"
import IconEdit from "~icons/lucide/edit"
import IconNote from "~icons/lucide/sticky-note"
import { useI18n } from "@composables/i18n"

import { HoppRESTRequest } from "@hoppscotch/data"

defineProps({
  request: {
    type: Object as PropType<HoppRESTRequest>,
    default: () => ({}),
    required: true,
  },
  responseIndex: {
    type: Number,
    default: 0,
    required: false,
  },
})

const t = useI18n()

const emit = defineEmits<{
  (event: "select-response"): void
  (event: "delete-response"): void
  (event: "edit-response"): void
}>()
</script>
