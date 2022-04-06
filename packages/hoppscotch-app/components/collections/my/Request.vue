<template>
  <div class="flex flex-col" :class="[{ 'bg-primaryLight': dragging }]">
    <div
      class="flex items-stretch group"
      draggable="true"
      @dragstart="dragStart"
      @dragover.stop
      @dragleave="dragging = false"
      @dragend="dragging = false"
      @contextmenu.prevent="options.tippy().show()"
    >
      <span
        class="flex items-center justify-center w-16 px-2 truncate cursor-pointer"
        :class="getRequestLabelColor(request.method)"
        @click="!doc ? selectRequest() : {}"
      >
        <SmartIcon
          v-if="isSelected"
          class="svg-icons"
          :class="{ 'text-accent': isSelected }"
          name="check-circle"
        />
        <span v-else class="truncate">
          {{ request.method }}
        </span>
      </span>
      <span
        class="flex items-center flex-1 min-w-0 py-2 pr-2 cursor-pointer transition group-hover:text-secondaryDark"
        @click="!doc ? selectRequest() : {}"
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
        <ButtonSecondary
          v-if="!saveRequest && !doc"
          v-tippy="{ theme: 'tooltip' }"
          svg="rotate-ccw"
          :title="t('action.restore')"
          class="hidden group-hover:inline-flex"
          @click.native="!doc ? selectRequest() : {}"
        />
        <span>
          <tippy
            ref="options"
            interactive
            trigger="click"
            theme="popover"
            arrow
            :on-shown="() => tippyActions.focus()"
          >
            <template #trigger>
              <ButtonSecondary
                v-tippy="{ theme: 'tooltip' }"
                :title="t('action.more')"
                svg="more-vertical"
              />
            </template>
            <div
              ref="tippyActions"
              class="flex flex-col focus:outline-none"
              tabindex="0"
              role="menu"
              @keyup.e="edit.$el.click()"
              @keyup.d="duplicate.$el.click()"
              @keyup.delete="deleteAction.$el.click()"
              @keyup.escape="options.tippy().hide()"
            >
              <SmartItem
                ref="edit"
                svg="edit"
                :label="t('action.edit')"
                :shortcut="['E']"
                @click.native="
                  () => {
                    $emit('edit-request', {
                      collectionIndex,
                      folderIndex,
                      folderName,
                      request,
                      requestIndex,
                      folderPath,
                    })
                    options.tippy().hide()
                  }
                "
              />
              <SmartItem
                ref="duplicate"
                svg="copy"
                :label="$t('action.duplicate')"
                :shortcut="['D']"
                @click.native="
                  () => {
                    $emit('duplicate-request', {
                      collectionIndex,
                      folderIndex,
                      folderName,
                      request,
                      requestIndex,
                      folderPath,
                    })
                    options.tippy().hide()
                  }
                "
              />
              <SmartItem
                ref="deleteAction"
                svg="trash-2"
                :label="t('action.delete')"
                :shortcut="['⌫']"
                @click.native="
                  () => {
                    confirmRemove = true
                    options.tippy().hide()
                  }
                "
              />
            </div>
          </tippy>
        </span>
      </div>
    </div>
    <SmartConfirmModal
      :show="confirmRemove"
      :title="t('confirm.remove_request')"
      @hide-modal="confirmRemove = false"
      @resolve="removeRequest"
    />
    <HttpApiChangeConfirmModal
      :show="confirmApiChange"
      @hide-modal="confirmApiChange = false"
      @save-change="saveRequestChange"
      @discard-change="discardRequestChange"
    />
    <CollectionsSaveRequest
      mode="rest"
      :show="showSaveRequestModal"
      @hide-modal="showSaveRequestModal = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "@nuxtjs/composition-api"
import {
  safelyExtractRESTRequest,
  translateToNewRequest,
} from "@hoppscotch/data"
import isEqual from "lodash/isEqual"
import {
  useI18n,
  useToast,
  useReadonlyStream,
} from "~/helpers/utils/composables"
import {
  getDefaultRESTRequest,
  getRESTRequest,
  restSaveContext$,
  setRESTRequest,
  setRESTSaveContext,
  getRESTSaveContext,
} from "~/newstore/RESTSession"
import {
  editRESTRequest,
  getRESTRequestFromFolderPath,
} from "~/newstore/collections"

const props = defineProps<{
  request: object
  collectionIndex: number
  folderIndex: number
  folderName: string
  requestIndex: number
  doc: boolean
  saveRequest: boolean
  collectionsType: object
  folderPath: string
  picked?: {
    pickedType: string
    collectionIndex: number
    folderPath: string
    folderName: string
    requestIndex: number
  }
}>()

const emit = defineEmits<{
  (
    e: "select",
    data:
      | {
          picked: {
            pickedType: string
            collectionIndex: number
            folderPath: string
            folderName: string
            requestIndex: number
          }
        }
      | undefined
  ): void

  (
    e: "remove-request",
    data: {
      collectionIndex: number
      folderName: string
      folderPath: string
      requestIndex: number
    }
  ): void
}>()

const t = useI18n()
const toast = useToast()

const dragging = ref<boolean>(false)
const requestMethodLabels = {
  get: "text-green-500",
  post: "text-yellow-500",
  put: "text-blue-500",
  delete: "text-red-500",
  default: "text-gray-500",
}
const confirmRemove = ref<boolean>(false)
const confirmApiChange = ref<boolean>(false)
const showSaveRequestModal = ref<boolean>(false)

// Template refs
const tippyActions = ref<any | null>(null)
const options = ref<any | null>(null)
const edit = ref<any | null>(null)
const duplicate = ref<any | null>(null)
const deleteAction = ref<any | null>(null)

const active = useReadonlyStream(restSaveContext$, null)

const isSelected = computed<boolean>(() => {
  return (
    props.picked &&
    props.picked.pickedType === "my-request" &&
    props.picked.folderPath === props.folderPath &&
    props.picked.requestIndex === props.requestIndex
  )
})

const isActive = computed<boolean>(() => {
  return (
    active.value &&
    active.value.originLocation === "user-collection" &&
    active.value.folderPath === props.folderPath &&
    active.value.requestIndex === props.requestIndex
  )
})

const dragStart = ({ dataTransfer }) => {
  dragging.value = !dragging.value
  dataTransfer.setData("folderPath", props.folderPath)
  dataTransfer.setData("requestIndex", props.requestIndex)
}

const removeRequest = () => {
  emit("remove-request", {
    collectionIndex: props.collectionIndex,
    folderName: props.folderName,
    folderPath: props.folderPath,
    requestIndex: props.requestIndex,
  })
}

const getRequestLabelColor = (method: string) => {
  return (
    requestMethodLabels[method.toLowerCase()] || requestMethodLabels.default
  )
}

const getIndexPath = (path: string) => {
  return path.split("/").map((x) => parseInt(x))
}

const selectRequest = () => {
  // If there is no active context
  if (!active.value) {
    confirmApiChange.value = true

    if (props.saveRequest)
      emit("select", {
        picked: {
          pickedType: "my-request",
          collectionIndex: props.collectionIndex,
          folderPath: props.folderPath,
          folderName: props.folderName,
          requestIndex: props.requestIndex,
        },
      })
  } else {
    const indexPath = getIndexPath(active.value.folderPath)

    const currentReqWithNoChange = getRESTRequestFromFolderPath(
      indexPath,
      active.value.requestIndex
    )
    const currentFullReq = getRESTRequest()

    // Check if whether user clicked the same request or not
    if (!isActive.value) {
      // Check if there is any changes done on the current request
      if (isEqual(currentReqWithNoChange, currentFullReq)) {
        setRESTRequest(
          safelyExtractRESTRequest(
            translateToNewRequest(props.request),
            getDefaultRESTRequest()
          ),
          {
            originLocation: "user-collection",
            folderPath: props.folderPath,
            requestIndex: props.requestIndex,
          }
        )
        if (props.saveRequest)
          emit("select", {
            picked: {
              pickedType: "my-request",
              collectionIndex: props.collectionIndex,
              folderPath: props.folderPath,
              folderName: props.folderName,
              requestIndex: props.requestIndex,
            },
          })
      } else {
        confirmApiChange.value = true
      }
    } else {
      setRESTSaveContext(null)
    }
  }
}

// Save current request to the collection
const saveRequestChange = () => {
  const saveCtx = getRESTSaveContext()
  saveCurrentRequest(saveCtx)
  confirmApiChange.value = false
}

// Discard changes and change the current request and context
const discardRequestChange = () => {
  setRESTRequest(
    safelyExtractRESTRequest(
      translateToNewRequest(props.request),
      getDefaultRESTRequest()
    ),
    {
      originLocation: "user-collection",
      folderPath: props.folderPath,
      requestIndex: props.requestIndex,
    }
  )
  if (props.saveRequest)
    emit("select", {
      picked: {
        pickedType: "my-request",
        collectionIndex: props.collectionIndex,
        folderPath: props.folderPath,
        folderName: props.folderName,
        requestIndex: props.requestIndex,
      },
    })
  if (!isActive.value) {
    setRESTSaveContext({
      originLocation: "user-collection",
      folderPath: props.folderPath,
      requestIndex: props.requestIndex,
    })
  }

  confirmApiChange.value = false
}

const saveCurrentRequest = (saveCtx: {
  originLocation: string
  folderPath: string
  requestIndex: number
  requestID: number
}) => {
  if (!saveCtx) {
    showSaveRequestModal.value = true
    return
  }
  if (saveCtx.originLocation === "user-collection") {
    try {
      editRESTRequest(
        saveCtx.folderPath,
        saveCtx.requestIndex,
        getRESTRequest()
      )
      setRESTRequest(
        safelyExtractRESTRequest(
          translateToNewRequest(props.request),
          getDefaultRESTRequest()
        ),
        {
          originLocation: "user-collection",
          folderPath: props.folderPath,
          requestIndex: props.requestIndex,
        }
      )
      toast.success(t("request.saved"))
    } catch (e) {
      setRESTSaveContext(null)
      saveCurrentRequest(saveCtx)
    }
  }
}
</script>
