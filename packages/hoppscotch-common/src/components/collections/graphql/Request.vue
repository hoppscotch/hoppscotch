<template>
  <div class="flex flex-col" :class="[{ 'bg-primaryLight': dragging }]">
    <div
      class="group flex items-stretch"
      draggable="true"
      @dragstart="dragStart"
      @dragover.stop
      @dragleave="dragging = false"
      @dragend="dragging = false"
      @contextmenu.prevent="options.tippy.show()"
    >
      <div
        class="pointer-events-auto flex min-w-0 flex-1 cursor-pointer items-center justify-center"
        @click="selectRequest()"
      >
        <span
          class="pointer-events-none flex w-8 items-center justify-center truncate px-6"
        >
          <component
            :is="isSelected ? IconCheckCircle : IconFile"
            class="svg-icons"
            :class="{ 'text-accent': isSelected }"
          />
        </span>
        <span
          class="pointer-events-none flex min-w-0 flex-1 items-center py-2 pr-2 transition group-hover:text-secondaryDark"
        >
          <span class="truncate" :class="{ 'text-accent': isSelected }">
            {{ request.name }}
          </span>
          <span
            v-if="isActive"
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
        <span>
          <tippy
            ref="options"
            interactive
            trigger="click"
            theme="popover"
            :on-shown="() => tippyActions.focus()"
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
                @keyup.e="edit.$el.click()"
                @keyup.d="duplicate.$el.click()"
                @keyup.delete="deleteAction.$el.click()"
                @keyup.escape="hide()"
              >
                <HoppSmartItem
                  ref="edit"
                  :icon="IconEdit"
                  :label="`${t('action.edit')}`"
                  :shortcut="['E']"
                  @click="
                    () => {
                      $emit('edit-request', {
                        request,
                        requestIndex,
                        folderPath,
                      })
                      hide()
                    }
                  "
                />
                <HoppSmartItem
                  ref="duplicate"
                  :icon="IconCopy"
                  :label="`${t('action.duplicate')}`"
                  :shortcut="['D']"
                  @click="
                    () => {
                      $emit('duplicate-request', {
                        request,
                        requestIndex,
                        folderPath,
                      })
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
                      confirmRemove = true
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
    <HoppSmartConfirmModal
      :show="confirmRemove"
      :title="`${t('confirm.remove_request')}`"
      @hide-modal="confirmRemove = false"
      @resolve="removeRequest"
    />
  </div>
</template>

<script setup lang="ts">
import IconCheckCircle from "~icons/lucide/check-circle"
import IconFile from "~icons/lucide/file"
import IconMoreVertical from "~icons/lucide/more-vertical"
import IconEdit from "~icons/lucide/edit"
import IconCopy from "~icons/lucide/copy"
import IconTrash2 from "~icons/lucide/trash-2"
import { PropType, computed, ref } from "vue"
import { useI18n } from "@composables/i18n"
import { useToast } from "@composables/toast"
import { HoppGQLRequest } from "@hoppscotch/data"
import { removeGraphqlRequest } from "~/newstore/collections"
import { useService } from "dioc/vue"
import { GQLTabService } from "~/services/tab/graphql"

// Template refs
const tippyActions = ref<any | null>(null)
const options = ref<any | null>(null)
const edit = ref<any | null>(null)
const duplicate = ref<any | null>(null)
const deleteAction = ref<any | null>(null)

const t = useI18n()
const toast = useToast()

const tabs = useService(GQLTabService)

const props = defineProps({
  // Whether the object is selected (show the tick mark)
  picked: { type: Object, default: null },
  // Whether the request is being saved (activate 'select' event)
  saveRequest: { type: Boolean, default: false },
  request: { type: Object as PropType<HoppGQLRequest>, default: () => ({}) },
  folderPath: { type: String, default: null },
  requestIndex: { type: Number, default: null },
})

const isActive = computed(() => {
  const saveCtx = tabs.currentActiveTab.value?.document.saveContext

  if (!saveCtx) return false

  return (
    saveCtx.originLocation === "user-collection" &&
    saveCtx.folderPath === props.folderPath &&
    saveCtx.requestIndex === props.requestIndex
  )
})

// TODO: Better types please
const emit = defineEmits([
  "select",
  "edit-request",
  "duplicate-request",
  "select-request",
])

const dragging = ref(false)
const confirmRemove = ref(false)

const isSelected = computed(
  () =>
    props.picked?.pickedType === "gql-my-request" &&
    props.picked?.folderPath === props.folderPath &&
    props.picked?.requestIndex === props.requestIndex
)

const pick = () => {
  emit("select", {
    pickedType: "gql-my-request",
    folderPath: props.folderPath,
    requestIndex: props.requestIndex,
  })
}

const selectRequest = () => {
  if (props.saveRequest) {
    pick()
  } else {
    emit("select-request", {
      request: props.request,
      folderPath: props.folderPath,
      requestIndex: props.requestIndex,
    })
  }
}

const dragStart = ({ dataTransfer }: any) => {
  dragging.value = !dragging.value

  dataTransfer.setData("folderPath", props.folderPath)
  dataTransfer.setData("requestIndex", props.requestIndex)
}

const removeRequest = () => {
  // Cancel pick if the picked request is deleted
  if (
    props.picked &&
    props.picked.pickedType === "gql-my-request" &&
    props.picked.folderPath === props.folderPath &&
    props.picked.requestIndex === props.requestIndex
  ) {
    emit("select", null)
  }

  // Detach the request from any of the tabs
  const possibleTab = tabs.getTabRefWithSaveContext({
    originLocation: "user-collection",
    folderPath: props.folderPath,
    requestIndex: props.requestIndex,
  })

  if (possibleTab) {
    possibleTab.value.document.saveContext = undefined
    possibleTab.value.document.isDirty = true
  }

  removeGraphqlRequest(props.folderPath, props.requestIndex, props.request.id)
  toast.success(`${t("state.deleted")}`)
}
</script>
