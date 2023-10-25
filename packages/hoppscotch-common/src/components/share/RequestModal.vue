<template>
  <HoppSmartModal
    v-if="show"
    dialog
    :title="t('modal.share_request')"
    styles="sm:max-w-md"
    @close="hideModal"
  >
    <template #body>
      <div
        v-if="selectedWidget"
        class="rounded divide-y border border-divider divide-divider"
      >
        <div v-if="loading" class="py-2 px-4">
          {{ t("shared_requests.creating_widget") }}
        </div>
        <div v-else class="py-2 px-4">
          {{ t("shared_requests.description") }}
        </div>
        <div
          v-if="loading"
          class="flex flex-col items-center justify-center p-4"
        >
          <HoppSmartSpinner class="my-4" />
          <span class="text-secondaryLight">{{ t("state.loading") }}</span>
        </div>
        <div v-else class="flex flex-col divide-y divide-divider">
          <div class="p-4 flex flex-col space-y-4">
            <div
              v-for="widget in widgets"
              :key="widget.id"
              class="flex flex-col border border-divider rounded px-4 py-3 space-y-2 cursor-pointer hover:bg-dividerLight h"
              :class="{ 'border-accentLight': selectedWidget.id === widget.id }"
              @click="selectedWidget = widget"
            >
              <span class="font-bold text-md">
                {{ widget.name }}
              </span>
              <span>
                {{ widget.info }}
              </span>
            </div>
          </div>
          <div class="flex flex-col divide-y divide-divider">
            <div class="py-3 px-4">{{ t("shared_requests.preview") }}</div>
            <div
              class="py-10 px-4 flex flex-col flex justify-center items-center"
            >
              <div
                class="border border-dotted px-4 py-3 border-dividerDark rounded flex justify-center items-center"
              >
                <div v-if="selectedWidget.id === 'embed'" class="flex flex-col">
                  <div
                    class="flex items-stretch divide-x border divide-divider rounded border-divider"
                  >
                    <span
                      class="flex items-center justify-center py-2 px-3 flex-1"
                    >
                      {{ request?.method }}
                    </span>
                    <span class="flex items-center p-2 max-w-40">
                      <span class="truncate min-w-0">
                        {{ request?.endpoint }}
                      </span>
                    </span>
                    <button
                      class="flex items-center justify-center bg-primaryDark px-3 py-2 rounded border border-dividerDark text-secondary font-semibold"
                    >
                      {{ t("action.send") }}
                    </button>
                  </div>
                  <div class="flex pt-2 border-b border-divider">
                    <span class="px-2 py-2 border-b border-dividerDark">
                      {{ t("tab.parameters") }}
                    </span>
                    <span class="px-2 py-2">
                      {{ t("tab.body") }}
                    </span>
                    <span class="px-2 py-2">
                      {{ t("tab.headers") }}
                    </span>
                    <span class="px-2 py-2">
                      {{ t("tab.authorization") }}
                    </span>
                  </div>
                </div>
                <button
                  v-else-if="selectedWidget.id === 'button'"
                  class="flex items-center bg-primaryDark px-3 py-2 rounded border border-dividerDark text-secondary font-semibold"
                >
                  <icon-lucide-play class="mr-2 svg-icons" />
                  <span>Run in Hoppscotch</span>
                </button>
                <span v-else> hopp.sh/r/XXXX </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
    <template #footer>
      <div class="flex justify-end">
        <HoppButtonPrimary
          :label="t('action.create')"
          :loading="loading"
          @click="createSharedRequest"
        />
        <HoppButtonSecondary
          :label="t('action.cancel')"
          class="mr-2"
          @click="hideModal"
        />
      </div>
    </template>
  </HoppSmartModal>
</template>

<script lang="ts" setup>
import { HoppRESTRequest } from "@hoppscotch/data"
import { useVModel } from "@vueuse/core"
import { PropType } from "vue"
import { useI18n } from "~/composables/i18n"

const t = useI18n()

const props = defineProps({
  request: {
    type: Object as PropType<HoppRESTRequest | null>,
    required: true,
  },
  show: {
    type: Boolean,
    default: false,
    required: true,
  },
  modelValue: {
    type: Object as PropType<Widget | null>,
    default: null,
  },
  loading: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits<{
  (e: "create-shared-request", request: HoppRESTRequest | null): void
  (e: "hide-modal"): void
  (e: "update:modelValue", value: string): void
}>()

const selectedWidget = useVModel(props, "modelValue")

type WidgetID = "embed" | "button" | "link"

type Widget = {
  id: WidgetID
  name: string
  info: string
}

const widgets: Widget[] = [
  {
    id: "embed",
    name: t("shared_requests.embed"),
    info: t("shared_requests.embed_info"),
  },
  {
    id: "button",
    name: t("shared_requests.button"),
    info: t("shared_requests.button_info"),
  },
  {
    id: "link",
    name: t("shared_requests.link"),
    info: t("shared_requests.link_info"),
  },
]

const createSharedRequest = () => {
  emit("create-shared-request", props.request)
}

const hideModal = () => {
  emit("hide-modal")
}
</script>
