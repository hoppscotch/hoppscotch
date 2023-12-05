<template>
  <div
    v-if="selectedWidget"
    class="divide-y divide-divider rounded border border-divider"
  >
    <div v-if="loading" class="px-4 py-2">
      {{ t("shared_requests.creating_widget") }}
    </div>
    <div v-else class="px-4 py-2">
      {{ t("shared_requests.description") }}
    </div>
    <div class="flex flex-col divide-y divide-divider">
      <div class="flex flex-col space-y-4 p-4">
        <div
          v-for="widget in widgets"
          :key="widget.value"
          class="flex cursor-pointer flex-col space-y-2 rounded border border-divider px-4 py-3 hover:bg-dividerLight"
          :class="{
            '!border-accentLight': selectedWidget.value === widget.value,
          }"
          @click="selectedWidget = widget"
        >
          <span class="text-md font-bold">
            {{ widget.label }}
          </span>
          <span class="text-tiny">
            {{ widget.info }}
          </span>
        </div>
      </div>
      <div class="flex flex-col divide-y divide-divider">
        <div class="px-4 py-3">{{ t("shared_requests.preview") }}</div>
        <div class="flex flex-col items-center justify-center px-4 py-10">
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
</script>
