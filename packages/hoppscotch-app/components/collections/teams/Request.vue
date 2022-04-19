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
          :title="`${$t('collection.request_in_use')}`"
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
          :title="$t('action.restore')"
          class="hidden group-hover:inline-flex"
          @click.native="!doc ? selectRequest() : {}"
        />
        <span>
          <tippy
            v-if="collectionsType.selectedTeam.myRole !== 'VIEWER'"
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
                :title="$t('action.more')"
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
                :label="$t('action.edit')"
                :shortcut="['E']"
                @click.native="
                  () => {
                    emit('edit-request', {
                      collectionIndex,
                      folderIndex,
                      folderName,
                      request,
                      requestIndex,
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
                    emit('duplicate-request', {
                      request,
                      requestIndex,
                      collectionID,
                    })
                    options.tippy().hide()
                  }
                "
              />
              <SmartItem
                ref="deleteAction"
                svg="trash-2"
                :label="$t('action.delete')"
                :shortcut="['⌫']"
                @click.native="
                  () => {
                    removeRequest()
                    options.tippy().hide()
                  }
                "
              />
            </div>
          </tippy>
        </span>
      </div>
    </div>
    <HttpReqChangeConfirmModal
      :show="confirmChange"
      @hide-modal="confirmChange = false"
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
  HoppRESTRequest,
  isEqualHoppRESTRequest,
  safelyExtractRESTRequest,
  translateToNewRequest,
} from "@hoppscotch/data"
import * as E from "fp-ts/Either"
import {
  useI18n,
  useToast,
  useReadonlyStream,
} from "~/helpers/utils/composables"
import {
  getDefaultRESTRequest,
  restSaveContext$,
  setRESTRequest,
  setRESTSaveContext,
  getRESTSaveContext,
  getRESTRequest,
} from "~/newstore/RESTSession"
import { editRESTRequest } from "~/newstore/collections"
import { runMutation } from "~/helpers/backend/GQLClient"
import { Team, UpdateRequestDocument } from "~/helpers/backend/graphql"
import { HoppRequestSaveContext } from "~/helpers/types/HoppRequestSaveContext"

const props = defineProps<{
  request: HoppRESTRequest
  collectionIndex: number
  folderIndex: number
  folderName?: string
  requestIndex: string
  doc: boolean
  saveRequest: boolean
  collectionsType: {
    type: "my-collections" | "team-collections"
    selectedTeam: Team | undefined
  }
  collectionID: string
  picked?: {
    pickedType: string
    requestID: string
  }
}>()

const emit = defineEmits<{
  (
    e: "select",
    data:
      | {
          picked: {
            pickedType: string
            requestID: string
          }
        }
      | undefined
  ): void

  (
    e: "remove-request",
    data: {
      folderPath: string | undefined
      requestIndex: string
    }
  ): void

  (
    e: "edit-request",
    data: {
      collectionIndex: number
      folderIndex: number
      folderName: string | undefined
      requestIndex: string
      request: HoppRESTRequest
    }
  ): void

  (
    e: "duplicate-request",
    data: {
      collectionID: number | string
      requestIndex: string
      request: HoppRESTRequest
    }
  ): void
}>()

const t = useI18n()
const toast = useToast()

const dragging = ref(false)
const requestMethodLabels = {
  get: "text-green-500",
  post: "text-yellow-500",
  put: "text-blue-500",
  delete: "text-red-500",
  default: "text-gray-500",
}
const confirmChange = ref(false)
const showSaveRequestModal = ref(false)

// Template refs
const tippyActions = ref<any | null>(null)
const options = ref<any | null>(null)
const edit = ref<any | null>(null)
const duplicate = ref<any | null>(null)
const deleteAction = ref<any | null>(null)

const active = useReadonlyStream(restSaveContext$, null)

const isSelected = computed(
  () =>
    props.picked &&
    props.picked.pickedType === "team-collection" &&
    props.picked.requestID === props.requestIndex
)

const isActive = computed(
  () =>
    active.value &&
    active.value.originLocation === "team-collection" &&
    active.value.requestID === props.requestIndex
)

const dragStart = ({ dataTransfer }: DragEvent) => {
  if (dataTransfer) {
    dragging.value = !dragging.value
    dataTransfer.setData("requestIndex", props.requestIndex)
  }
}

const removeRequest = () => {
  emit("remove-request", {
    folderPath: props.folderName,
    requestIndex: props.requestIndex,
  })
}

const getRequestLabelColor = (method: string): string => {
  return (
    (requestMethodLabels as any)[method.toLowerCase()] ||
    requestMethodLabels.default
  )
}

const setRestReq = (request: HoppRESTRequest) => {
  setRESTRequest(
    safelyExtractRESTRequest(
      translateToNewRequest(request),
      getDefaultRESTRequest()
    ),
    {
      originLocation: "team-collection",
      requestID: props.requestIndex,
      req: request,
    }
  )
}

const selectRequest = () => {
  if (!active.value) {
    confirmChange.value = true

    if (props.saveRequest)
      emit("select", {
        picked: {
          pickedType: "team-collection",
          requestID: props.requestIndex,
        },
      })
  } else {
    const currentReqWithNoChange = active.value.req
    const currentFullReq = getRESTRequest()

    // Check if whether user clicked the same request or not
    if (!isActive.value && currentReqWithNoChange) {
      // Check if there is any changes done on the current request
      if (isEqualHoppRESTRequest(currentReqWithNoChange, currentFullReq)) {
        setRestReq(props.request)
        if (props.saveRequest)
          emit("select", {
            picked: {
              pickedType: "team-collection",
              requestID: props.requestIndex,
            },
          })
      } else {
        confirmChange.value = true
      }
    } else {
      setRESTSaveContext(null)
    }
  }
}

/** Save current request to the collection */
const saveRequestChange = () => {
  const saveCtx = getRESTSaveContext()
  saveCurrentRequest(saveCtx)
  confirmChange.value = false
}

/** Discard changes and change the current request and context */
const discardRequestChange = () => {
  setRestReq(props.request)
  if (props.saveRequest)
    emit("select", {
      picked: {
        pickedType: "team-collection",
        requestID: props.requestIndex,
      },
    })
  if (!isActive.value) {
    setRESTSaveContext({
      originLocation: "team-collection",
      requestID: props.requestIndex,
      req: props.request,
    })
  }

  confirmChange.value = false
}

const saveCurrentRequest = (saveCtx: HoppRequestSaveContext | null) => {
  if (!saveCtx) {
    showSaveRequestModal.value = true
    return
  }
  if (saveCtx.originLocation === "team-collection") {
    const req = getRESTRequest()
    try {
      runMutation(UpdateRequestDocument, {
        requestID: saveCtx.requestID,
        data: {
          title: req.name,
          request: JSON.stringify(req),
        },
      })().then((result) => {
        if (E.isLeft(result)) {
          toast.error(`${t("profile.no_permission")}`)
        } else {
          toast.success(`${t("request.saved")}`)
        }
      })
      setRestReq(props.request)
    } catch (error) {
      showSaveRequestModal.value = true
      toast.error(`${t("error.something_went_wrong")}`)
      console.error(error)
    }
  } else if (saveCtx.originLocation === "user-collection") {
    try {
      editRESTRequest(
        saveCtx.folderPath,
        saveCtx.requestIndex,
        getRESTRequest()
      )
      setRestReq(props.request)
      toast.success(`${t("request.saved")}`)
    } catch (e) {
      setRESTSaveContext(null)
      saveCurrentRequest(null)
    }
  }
}
</script>
