<template>
  <div
    v-tippy="{ theme: 'tooltip', delay: [500, 20] }"
    :title="tabDocument.request.name"
    class="flex items-center truncate px-2"
    @dblclick="emit('open-rename-modal')"
    @contextmenu.prevent="options?.tippy?.show()"
    @click.middle="emit('close-tab')"
  >
    <span
      class="text-tiny font-semibold mr-2"
      :style="{ color: getMethodLabelColorClassOf(tabDocument.request) }"
    >
      {{ tabDocument.request.method }}
    </span>
    <tippy
      ref="options"
      trigger="manual"
      interactive
      theme="popover"
      :on-shown="() => tippyActions!.focus()"
    >
      <span class="truncate">
        {{ tabDocument.request.name }}
      </span>
      <template #content="{ hide }">
        <div
          ref="tippyActions"
          class="flex flex-col focus:outline-none"
          tabindex="0"
          @keyup.r="renameAction?.$el.click()"
          @keyup.d="duplicateAction?.$el.click()"
          @keyup.w="closeAction?.$el.click()"
          @keyup.x="closeOthersAction?.$el.click()"
          @keyup.escape="hide()"
        >
          <HoppSmartItem
            ref="renameAction"
            :icon="IconFileEdit"
            :label="t('request.rename')"
            :shortcut="['R']"
            @click="
              () => {
                emit('open-rename-modal')
                hide()
              }
            "
          />
          <HoppSmartItem
            ref="duplicateAction"
            :icon="IconCopy"
            :label="t('tab.duplicate')"
            :shortcut="['D']"
            @click="
              () => {
                emit('duplicate-tab')
                hide()
              }
            "
          />
          <HoppSmartItem
            v-if="isRemovable"
            ref="closeAction"
            :icon="IconXCircle"
            :label="t('tab.close')"
            :shortcut="['W']"
            @click="
              () => {
                emit('close-tab')
                hide()
              }
            "
          />
          <HoppSmartItem
            v-if="isRemovable"
            ref="closeOthersAction"
            :icon="IconXSquare"
            :label="t('tab.close_others')"
            :shortcut="['X']"
            @click="
              () => {
                emit('close-other-tabs')
                hide()
              }
            "
          />
        </div>
      </template>
    </tippy>
  </div>
</template>

<script setup lang="ts">
import { ComputedRef, ref, watch } from "vue"
import { TippyComponent } from "vue-tippy"
import { getMethodLabelColorClassOf } from "~/helpers/rest/labelColoring"
import { useI18n } from "~/composables/i18n"
import IconXCircle from "~icons/lucide/x-circle"
import IconXSquare from "~icons/lucide/x-square"
import IconFileEdit from "~icons/lucide/file-edit"
import IconCopy from "~icons/lucide/copy"
import { HoppTab } from "~/services/tab"
import { HoppRESTDocument } from "~/helpers/rest/document"
import { computed } from "vue"
import { HandleRef } from "~/services/new-workspace/handle"
import { WorkspaceRequest } from "~/services/new-workspace/workspace"

const t = useI18n()

const props = defineProps<{
  tab: HoppTab<HoppRESTDocument>
  isRemovable: boolean
}>()

const emit = defineEmits<{
  (event: "open-rename-modal"): void
  (event: "close-tab"): void
  (event: "close-other-tabs"): void
  (event: "duplicate-tab"): void
}>()

const tippyActions = ref<TippyComponent | null>(null)
const options = ref<TippyComponent | null>(null)

const renameAction = ref<HTMLButtonElement | null>(null)
const closeAction = ref<HTMLButtonElement | null>(null)
const closeOthersAction = ref<HTMLButtonElement | null>(null)
const duplicateAction = ref<HTMLButtonElement | null>(null)
const tabDocument = ref<HoppRESTDocument>(props.tab.document)

const requestHandleForCurrentTab = computed(() => {
  return props.tab.document.saveContext?.originLocation ===
    "workspace-user-collection"
    ? props.tab.document.saveContext.requestHandle
    : undefined
}) as ComputedRef<HandleRef<WorkspaceRequest>["value"] | undefined>

watch(
  requestHandleForCurrentTab,
  (newRequestHandleState) => {
    if (!newRequestHandleState) {
      return
    }

    if (newRequestHandleState.type !== "ok") {
      return
    }

    if (
      tabDocument.value.request.name !== newRequestHandleState.data.request.name
    ) {
      tabDocument.value.request.name = newRequestHandleState.data.request.name
    }
  },
  { deep: true }
)

watch(
  props.tab.document,
  (newTabDocument) => {
    ;(tabDocument.value as HoppRESTDocument) = newTabDocument
  },
  { deep: true }
)
</script>
