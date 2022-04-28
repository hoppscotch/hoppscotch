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
        @click="!doc ? selectRequest() : {}"
      >
        <SmartIcon
          class="svg-icons"
          :class="{ 'text-accent': isSelected }"
          :name="isSelected ? 'check-circle' : 'file'"
        />
      </span>
      <span
        class="flex flex-1 min-w-0 py-2 pr-2 cursor-pointer transition group-hover:text-secondaryDark"
        @click="!doc ? selectRequest() : {}"
      >
        <span class="truncate" :class="{ 'text-accent': isSelected }">
          {{ request.name }}
        </span>
      </span>
      <div class="flex">
        <ButtonSecondary
          v-if="!savingMode"
          v-tippy="{ theme: 'tooltip' }"
          svg="rotate-ccw"
          :title="$t('action.restore')"
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
                :label="`${$t('action.edit')}`"
                :shortcut="['E']"
                @click.native="
                  () => {
                    $emit('edit-request', {
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
                :label="`${$t('action.duplicate')}`"
                :shortcut="['D']"
                @click.native="
                  () => {
                    $emit('duplicate-request', {
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
                :label="`${$t('action.delete')}`"
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
      :title="`${$t('confirm.remove_request')}`"
      @hide-modal="confirmRemove = false"
      @resolve="removeRequest"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "@nuxtjs/composition-api"
import { HoppGQLRequest, makeGQLRequest } from "@hoppscotch/data"
import { cloneDeep } from "lodash"
import { removeGraphqlRequest } from "~/newstore/collections"
import { setGQLSession } from "~/newstore/GQLSession"
import { useI18n, useToast } from "~/helpers/utils/composables"

const toast = useToast()
const t = useI18n()

type PickedType = {
  pickedType: "gql-my-request"
  requestIndex: number
  folderPath: string
} | null

const props = defineProps<{
  // Whether the object is selected (show the tick mark)
  picked: PickedType
  // Whether the request is being saved (activate 'select' event)
  savingMode: boolean
  request: HoppGQLRequest
  requestIndex: number
  folderPath: string
  doc: boolean
}>()

const emit = defineEmits<{
  (e: "select", v: { picked: PickedType }): void
}>()

const tippyActions = ref<unknown | null>(null)
const options = ref<unknown | null>(null)
const edit = ref<unknown | null>(null)
const duplicate = ref<unknown | null>(null)
const deleteAction = ref<unknown | null>(null)

const dragging = ref(false)
const confirmRemove = ref(false)

const isSelected = computed(
  () =>
    !!props.picked &&
    props.picked.pickedType === "gql-my-request" &&
    props.picked.folderPath === props.folderPath &&
    props.picked.requestIndex === props.requestIndex
)

const select = (picked: PickedType) => {
  emit("select", { picked })
}

const selectRequest = () => {
  if (props.savingMode)
    select({
      pickedType: "gql-my-request",
      folderPath: props.folderPath,
      requestIndex: props.requestIndex,
    })
  else
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

const dragStart = ({ dataTransfer }: DragEvent) => {
  if (dataTransfer) {
    dragging.value = !dragging.value

    dataTransfer.setData("folderPath", props.folderPath)
    dataTransfer.setData("requestIndex", `${props.requestIndex}`)
  }
}

const removeRequest = () => {
  // Cancel pick if the picked request is deleted
  if (isSelected.value) select(null)

  removeGraphqlRequest(props.folderPath, props.requestIndex)
  toast.success(`${t("state.deleted")}`)
}
</script>
