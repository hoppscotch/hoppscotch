<template>
  <div class="flex flex-col" :class="[{ 'bg-primaryLight': dragging }]">
    <div
      class="flex items-stretch group"
      draggable="true"
      @dragstart="dragStart"
      @dragover.stop
      @dragleave="dragging = false"
      @dragend="dragging = false"
      @contextmenu.prevent="options.tippy.show()"
    >
      <span
        class="flex items-center justify-center w-16 px-2 truncate cursor-pointer"
        @click="selectRequest()"
      >
        <component
          :is="isSelected ? IconCheckCircle : IconFile"
          class="svg-icons"
          :class="{ 'text-accent': isSelected }"
        />
      </span>
      <span
        class="flex items-center flex-1 min-w-0 py-2 pr-2 cursor-pointer transition group-hover:text-secondaryDark"
        @click="selectRequest()"
      >
        <span class="truncate" :class="{ 'text-accent': isSelected }">
          {{ request.name }}
        </span>
        <span
          v-if="isActive"
          v-tippy="{ theme: 'tooltip' }"
          class="relative h-1.5 w-1.5 flex flex-shrink-0 mx-3"
          :title="`${t('collection.request_in_use')}`"
        >
          <span
            class="absolute inline-flex flex-shrink-0 w-full h-full bg-green-500 rounded-full opacity-75 animate-ping"
          >
          </span>
          <span
            class="relative inline-flex flex-shrink-0 rounded-full h-1.5 w-1.5 bg-green-500"
          ></span>
        </span>
      </span>
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
import { HoppGQLRequest, makeGQLRequest } from "@hoppscotch/data"
import { cloneDeep } from "lodash-es"
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
const emit = defineEmits(["select", "edit-request", "duplicate-request"])

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
    const possibleTab = tabs.getTabRefWithSaveContext({
      originLocation: "user-collection",
      folderPath: props.folderPath,
      requestIndex: props.requestIndex,
    })

    // Switch to that request if that request is open
    if (possibleTab) {
      tabs.setActiveTab(possibleTab.value.id)
      return
    }

    tabs.createNewTab({
      saveContext: {
        originLocation: "user-collection",
        folderPath: props.folderPath,
        requestIndex: props.requestIndex,
      },
      request: cloneDeep(
        makeGQLRequest({
          name: props.request.name,
          url: props.request.url,
          query: props.request.query,
          headers: props.request.headers,
          variables: props.request.variables,
          auth: props.request.auth,
        })
      ),
      isDirty: false,
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
