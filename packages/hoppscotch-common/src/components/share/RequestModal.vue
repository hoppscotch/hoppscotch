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
              :key="widget.value"
              class="flex flex-col border border-divider rounded px-4 py-3 space-y-2 cursor-pointer hover:bg-dividerLight h"
              :class="{
                'border-accentLight': selectedWidget.value === widget.value,
              }"
              @click="selectedWidget = widget"
            >
              <span class="font-bold text-md">
                {{ widget.label }}
              </span>
              <span class="text-tiny">
                {{ widget.info }}
              </span>
            </div>
          </div>
          <div class="flex flex-col divide-y divide-divider">
            <div class="py-3 px-4">{{ t("shared_requests.preview") }}</div>
            <div
              class="py-10 px-4 flex flex-col flex justify-center items-center"
            >
              <div class="px-4 py-3 rounded flex justify-center items-center">
                <ShareTemplatesEmbeds
                  v-if="selectedWidget.value === 'embed'"
                  :endpoint="request?.endpoint"
                  :method="request?.method"
                  :model-value="embedOption"
                />
                <ShareTemplatesButton
                  v-else-if="selectedWidget.value === 'button'"
                  img="badge.svg"
                />
                <ShareTemplatesLink v-else />
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
import { PropType, ref } from "vue"
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
  value: WidgetID
  label: string
  info: string
}

const widgets: Widget[] = [
  {
    value: "embed",
    label: t("shared_requests.embed"),
    info: t("shared_requests.embed_info"),
  },
  {
    value: "button",
    label: t("shared_requests.button"),
    info: t("shared_requests.button_info"),
  },
  {
    value: "link",
    label: t("shared_requests.link"),
    info: t("shared_requests.link_info"),
  },
]

type Tabs = "parameters" | "body" | "headers" | "authorization"

type EmbedOption = {
  selectedTab: Tabs
  tabs: {
    value: Tabs
    label: string
    enabled: boolean
  }[]
  theme: "light" | "dark" | "system"
}

const embedOption = ref<EmbedOption>({
  selectedTab: "parameters",
  tabs: [
    {
      value: "parameters",
      label: t("tab.parameters"),
      enabled: true,
    },
    {
      value: "body",
      label: t("tab.body"),
      enabled: true,
    },
    {
      value: "headers",
      label: t("tab.headers"),
      enabled: true,
    },
    {
      value: "authorization",
      label: t("tab.authorization"),
      enabled: true,
    },
  ],
  theme: "system",
})

const createSharedRequest = () => {
  emit("create-shared-request", props.request)
}

const hideModal = () => {
  emit("hide-modal")
}
</script>
