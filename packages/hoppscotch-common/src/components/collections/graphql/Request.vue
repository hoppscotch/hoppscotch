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
        class="flex flex-1 min-w-0 py-2 pr-2 cursor-pointer transition group-hover:text-secondaryDark"
        @click="selectRequest()"
      >
        <span class="truncate" :class="{ 'text-accent': isSelected }">
          {{ request.name }}
        </span>
      </span>
      <div class="flex">
        <HoppButtonSecondary
          v-if="!saveRequest"
          v-tippy="{ theme: 'tooltip' }"
          :icon="IconRotateCCW"
          :title="t('action.restore')"
          class="hidden group-hover:inline-flex"
          @click="selectRequest()"
        />
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
import IconRotateCCW from "~icons/lucide/rotate-ccw"
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
import { setGQLSession } from "~/newstore/GQLSession"

// Template refs
const tippyActions = ref<any | null>(null)
const options = ref<any | null>(null)
const edit = ref<any | null>(null)
const duplicate = ref<any | null>(null)
const deleteAction = ref<any | null>(null)

const t = useI18n()
const toast = useToast()

const props = defineProps({
  // Whether the object is selected (show the tick mark)
  picked: { type: Object, default: null },
  // Whether the request is being saved (activate 'select' event)
  saveRequest: { type: Boolean, default: false },
  request: { type: Object as PropType<HoppGQLRequest>, default: () => ({}) },
  folderPath: { type: String, default: null },
  requestIndex: { type: Number, default: null },
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
    setGQLSession({
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
      schema: "",
      response: "",
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

  removeGraphqlRequest(props.folderPath, props.requestIndex, props.request.id)
  toast.success(`${t("state.deleted")}`)
}
</script>
