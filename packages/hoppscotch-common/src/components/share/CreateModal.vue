<template>
  <div
    v-if="selectedWidget"
    class="border divide-y rounded divide-divider border-divider"
  >
    <div v-if="loading" class="px-4 py-2">
      {{ t("shared_requests.creating_widget") }}
    </div>
    <div v-else class="px-4 py-2">
      {{ t("shared_requests.description") }}
    </div>
    <div class="flex flex-col divide-y divide-divider">
      <div class="flex flex-col p-4 space-y-4">
        <div
          v-for="widget in widgets"
          :key="widget.value"
          class="flex flex-col p-4 border rounded cursor-pointer border-divider hover:bg-dividerLight"
          :class="{
            '!border-accentLight': selectedWidget.value === widget.value,
          }"
          @click="selectedWidget = widget"
        >
          <span class="mb-1 font-bold text-secondaryDark">
            {{ widget.label }}
          </span>
          <span class="text-tiny">
            {{ widget.info }}
          </span>
        </div>
      </div>
      <div class="flex flex-col items-center justify-center p-4">
        <span
          class="flex justify-center flex-1 mb-2 text-secondaryLight text-tiny"
        >
          {{ t("shared_requests.preview") }}
        </span>
        <div class="w-full">
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
  modelValue: {
    type: Object as PropType<Widget | null>,
    default: null,
  },
  loading: {
    type: Boolean,
    default: false,
  },
})

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

type Tabs = "params" | "bodyParams" | "headers" | "authorization"

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
  selectedTab: "params",
  tabs: [
    {
      value: "params",
      label: t("tab.parameters"),
      enabled: true,
    },
    {
      value: "bodyParams",
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
      enabled: false,
    },
  ],
  theme: "system",
})
</script>
