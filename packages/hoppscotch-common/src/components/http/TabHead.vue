<template>
  <div
    v-tippy="{ theme: 'tooltip', delay: [500, 20] }"
    :title="tab.document.request.name"
    class="truncate px-2 flex items-center"
    @dblclick="emit('open-rename-modal')"
    @contextmenu.prevent="options?.tippy.show()"
  >
    <span
      class="font-semibold text-tiny"
      :class="getMethodLabelColorClassOf(tab.document.request)"
    >
      {{ tab.document.request.method }}
    </span>

    <tippy
      ref="options"
      trigger="manual"
      interactive
      theme="popover"
      :on-shown="() => tippyActions!.focus()"
    >
      <span class="leading-8 px-2">
        {{ tab.document.request.name }}
      </span>
      <template #content="{ hide }">
        <div
          ref="tippyActions"
          class="flex flex-col focus:outline-none"
          tabindex="0"
          @keyup.r="renameAction?.$el.click()"
          @keyup.c="closeAction?.$el.click()"
          @keyup.a="closeOthersAction?.$el.click()"
          @keyup.d="duplicateAction?.$el.click()"
          @keyup.escape="hide()"
        >
          <HoppSmartItem
            ref="renameAction"
            :icon="IconFileEdit"
            :label="t('action.rename')"
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
            :label="t('action.duplicate_tab')"
            :shortcut="['D']"
            @click="
              () => {
                emit('duplicate-tab')
                hide()
              }
            "
          />
          <HoppSmartItem
            ref="closeAction"
            :icon="IconX"
            :label="t('action.close')"
            :shortcut="['C']"
            @click="
              () => {
                emit('close-tab')
                hide()
              }
            "
          />
          <HoppSmartItem
            ref="closeOthersAction"
            :icon="IconXSquare"
            :label="t('action.close_other_tabs')"
            :shortcut="['A']"
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
import { ref } from "vue"
import { TippyComponent } from "vue-tippy"
import { getMethodLabelColorClassOf } from "~/helpers/rest/labelColoring"
import { useI18n } from "~/composables/i18n"
import { HoppRESTTab } from "~/helpers/rest/tab"
import IconX from "~icons/lucide/x"
import IconXSquare from "~icons/lucide/x-square"
import IconFileEdit from "~icons/lucide/file-edit"
import IconCopy from "~icons/lucide/copy"

const t = useI18n()

defineProps<{
  tab: HoppRESTTab
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
</script>
