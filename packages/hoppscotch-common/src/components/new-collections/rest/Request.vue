<template>
  <div class="flex flex-col">
    <div
      class="group flex items-stretch"
      @contextmenu.prevent="options?.tippy.show()"
    >
      <div
        class="pointer-events-auto flex min-w-0 flex-1 cursor-pointer items-center justify-center"
        @click="selectRequest"
      >
        <span
          class="pointer-events-none flex w-16 items-center justify-center truncate px-2"
          :class="requestLabelColor"
          :style="{ color: requestLabelColor }"
        >
          <component
            :is="IconCheckCircle"
            v-if="isSelected"
            class="svg-icons"
            :class="{ 'text-accent': isSelected }"
          />
          <span v-else class="truncate text-tiny font-semibold">
            {{ requestView.request.method }}
          </span>
        </span>
        <span
          class="pointer-events-none flex min-w-0 flex-1 items-center py-2 pr-2 transition group-hover:text-secondaryDark"
        >
          <span class="truncate" :class="{ 'text-accent': isSelected }">
            {{ requestView.request.name }}
          </span>
          <span
            v-if="props.isActive"
            v-tippy="{ theme: 'tooltip' }"
            class="relative mx-3 flex h-1.5 w-1.5 flex-shrink-0"
            :title="`${t('collection.request_in_use')}`"
          >
            <span
              class="absolute inline-flex h-full w-full flex-shrink-0 animate-ping rounded-full bg-green-500 opacity-75"
            >
            </span>
            <span
              class="relative inline-flex h-1.5 w-1.5 flex-shrink-0 rounded-full bg-green-500"
            ></span>
          </span>
        </span>
      </div>
      <div class="flex">
        <HoppButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :icon="IconRotateCCW"
          :title="t('action.restore')"
          class="hidden group-hover:inline-flex"
          @click="selectRequest"
        />
        <span>
          <tippy
            ref="options"
            interactive
            trigger="click"
            theme="popover"
            :on-shown="() => tippyActions!.focus()"
          >
            <HoppButtonSecondary
              v-tippy="{ theme: 'tooltip' }"
              :title="t('action.more')"
              :icon="IconMoreVertical"
            />
            <template #content="{ hide }">
              <div
                ref="tippyActions"
                class="flex flex-col focus:outline-none"
                tabindex="0"
                @keyup.e="edit?.$el.click()"
                @keyup.d="duplicate?.$el.click()"
                @keyup.delete="deleteAction?.$el.click()"
                @keyup.escape="hide()"
              >
                <HoppSmartItem
                  ref="edit"
                  :icon="IconEdit"
                  :label="t('action.edit')"
                  :shortcut="['E']"
                  @click="
                    () => {
                      emit('edit-request', {
                        requestIndexPath: requestView.requestID,
                        requestName: requestView.request.name,
                      })
                      hide()
                    }
                  "
                />
                <HoppSmartItem
                  ref="duplicate"
                  :icon="IconCopy"
                  :label="t('action.duplicate')"
                  :shortcut="['D']"
                  @click="
                    () => {
                      emit('duplicate-request', requestView.requestID)
                      hide()
                    }
                  "
                />
                <HoppSmartItem
                  ref="deleteAction"
                  :icon="IconTrash2"
                  :label="t('action.delete')"
                  :shortcut="['⌫']"
                  @click="
                    () => {
                      emit('remove-request', requestView.requestID)
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
import IconCheckCircle from "~icons/lucide/check-circle"
import IconMoreVertical from "~icons/lucide/more-vertical"
import IconEdit from "~icons/lucide/edit"
import IconCopy from "~icons/lucide/copy"
import IconTrash2 from "~icons/lucide/trash-2"
import IconRotateCCW from "~icons/lucide/rotate-ccw"
import { useI18n } from "@composables/i18n"
import { RESTCollectionViewRequest } from "~/services/new-workspace/view"
import { computed, ref } from "vue"
import { TippyComponent } from "vue-tippy"
import { getMethodLabelColorClassOf } from "~/helpers/rest/labelColoring"

const t = useI18n()

const props = defineProps<{
  isActive: boolean
  requestView: RESTCollectionViewRequest
  isSelected: boolean | null | undefined
}>()

const emit = defineEmits<{
  (event: "duplicate-request", requestIndexPath: string): void
  (
    event: "edit-request",
    payload: {
      requestIndexPath: string
      requestName: string
    }
  ): void
  (event: "remove-request", requestIndexPath: string): void
  (event: "select-request", requestIndexPath: string): void
}>()

const tippyActions = ref<TippyComponent | null>(null)
const options = ref<TippyComponent | null>(null)

const requestLabelColor = computed(() =>
  getMethodLabelColorClassOf(props.requestView.request)
)

const selectRequest = () => emit("select-request", props.requestView.requestID)
</script>
