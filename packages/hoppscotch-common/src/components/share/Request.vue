<template>
  <div
    class="group flex items-stretch"
    @contextmenu.prevent="options!.tippy.show()"
  >
    <div
      v-tippy="{ theme: 'tooltip', delay: [500, 20] }"
      class="pointer-events-auto flex min-w-0 flex-1 cursor-pointer items-center justify-center py-2"
      :title="`${timeStamp}`"
      @click="openInNewTab"
    >
      <span
        class="pointer-events-none flex w-16 items-center justify-center truncate px-2"
        :style="{ color: requestLabelColor }"
      >
        <span class="truncate text-tiny font-semibold">
          {{ parseRequest.method }}
        </span>
      </span>
      <span
        class="pointer-events-none flex min-w-0 flex-1 items-center pr-2 transition group-hover:text-secondaryDark"
      >
        <span class="flex-1 truncate">
          {{ parseRequest.endpoint }}
        </span>
      </span>
      <span
        class="flex-1 truncate border-l border-dividerDark px-2 text-secondaryLight group-hover:text-secondaryDark"
      >
        {{ parseRequest.name }}
      </span>
    </div>
    <div>
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
              role="menu"
              @keyup.t="openInNewTabAction?.$el.click()"
              @keyup.e="customizeAction?.$el.click()"
              @keyup.delete="deleteAction?.$el.click()"
              @keyup.escape="hide()"
            >
              <HoppSmartItem
                ref="openInNewTabAction"
                :icon="IconArrowUpRight"
                :label="`${t('shared_requests.open_new_tab')}`"
                :shortcut="['T']"
                @click="
                  () => {
                    openInNewTab()
                    hide()
                  }
                "
              />
              <HoppSmartItem
                ref="customizeAction"
                :icon="IconFileEdit"
                :label="`${t('shared_requests.customize')}`"
                :shortcut="['E']"
                @click="
                  () => {
                    customizeSharedRequest()
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
                    deleteSharedRequest()
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
</template>

<script lang="ts" setup>
import { HoppRESTRequest, translateToNewRequest } from "@hoppscotch/data"
import { pipe } from "fp-ts/lib/function"
import { ref } from "vue"
import { computed } from "vue"
import { TippyComponent } from "vue-tippy"
import { useI18n } from "~/composables/i18n"
import { getMethodLabelColorClassOf } from "~/helpers/rest/labelColoring"
import { Shortcode } from "~/helpers/shortcode/Shortcode"
import IconArrowUpRight from "~icons/lucide/arrow-up-right-square"
import IconMoreVertical from "~icons/lucide/more-vertical"
import IconFileEdit from "~icons/lucide/file-edit"
import IconTrash2 from "~icons/lucide/trash-2"
import { shortDateTime } from "~/helpers/utils/date"

const t = useI18n()

const props = defineProps<{
  request: Shortcode
}>()

const emit = defineEmits<{
  (e: "customize-shared-request", request: HoppRESTRequest, id: string): void
  (e: "delete-shared-request", codeID: string): void
  (e: "open-new-tab", request: HoppRESTRequest): void
}>()

const tippyActions = ref<TippyComponent | null>(null)
const openInNewTabAction = ref<HTMLButtonElement | null>(null)
const customizeAction = ref<HTMLButtonElement | null>(null)
const deleteAction = ref<HTMLButtonElement | null>(null)

const parseRequest = computed(() =>
  pipe(props.request.request, JSON.parse, translateToNewRequest)
)

const requestLabelColor = computed(() =>
  getMethodLabelColorClassOf(parseRequest.value)
)

const openInNewTab = () => {
  emit("open-new-tab", parseRequest.value)
}

const customizeSharedRequest = () => {
  emit("customize-shared-request", parseRequest.value, props.request.id)
}

const deleteSharedRequest = () => {
  emit("delete-shared-request", props.request.id)
}

const timeStamp = computed(() => shortDateTime(props.request.createdOn))
</script>
