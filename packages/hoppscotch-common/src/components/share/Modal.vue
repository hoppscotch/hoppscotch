<template>
  <HoppSmartModal
    v-if="show"
    dialog
    :title="
      step === 1 ? t('modal.share_request') : t('modal.customize_request')
    "
    styles="sm:max-w-md"
    @close="hideModal"
  >
    <template #body>
      <div v-if="loading" class="flex flex-col items-center justify-center p-4">
        <HoppSmartSpinner class="my-4" />
        <span class="text-secondaryLight">{{ t("state.loading") }}</span>
      </div>
      <ShareCreateModal
        v-else-if="step === 1"
        v-model="selectedWidget"
        :request="request"
        :loading="loading"
        @create-shared-request="createSharedRequest"
      />
      <ShareCustomizeModal
        v-else-if="step === 2"
        v-model="selectedWidget"
        v-model:embed-options="embedOptions"
        :request="request"
        :loading="loading"
        @copy-shared-request="copySharedRequest"
      />
    </template>
    <template v-if="step === 1" #footer>
      <div class="flex justify-start flex-1">
        <HoppButtonPrimary
          :label="t('action.create')"
          :loading="loading"
          @click="createSharedRequest"
        />
        <HoppButtonSecondary
          :label="t('action.cancel')"
          class="ml-2"
          filled
          outline
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

type EmbedTabs =
  | "params"
  | "bodyParams"
  | "headers"
  | "authorization"
  | "requestVariables"

type EmbedOption = {
  selectedTab: EmbedTabs
  tabs: {
    value: EmbedTabs
    label: string
    enabled: boolean
  }[]
  theme: "light" | "dark" | "system"
}

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
  step: {
    type: Number,
    default: 1,
  },
  embedOptions: {
    type: Object as PropType<EmbedOption>,
    default: () => ({
      selectedTab: "params",
      tabs: [
        {
          value: "params",
          label: "shared_requests.parameters",
          enabled: true,
        },
        {
          value: "bodyParams",
          label: "shared_requests.body",
          enabled: true,
        },
        {
          value: "headers",
          label: "shared_requests.headers",
          enabled: true,
        },
        {
          value: "authorization",
          label: "shared_requests.authorization",
          enabled: false,
        },
      ],
      theme: "system",
    }),
  },
})

type WidgetID = "embed" | "button" | "link"

type Widget = {
  value: WidgetID
  label: string
  info: string
}

const selectedWidget = useVModel(props, "modelValue")
const embedOptions = useVModel(props, "embedOptions")

const emit = defineEmits<{
  (e: "create-shared-request", request: HoppRESTRequest | null): void
  (e: "hide-modal"): void
  (e: "update:modelValue", value: string): void
  (e: "update:step", value: number): void
  (
    e: "copy-shared-request",
    payload: {
      sharedRequestID: string | undefined
      content: string | undefined
    }
  ): void
}>()

const createSharedRequest = () => {
  emit("create-shared-request", props.request as HoppRESTRequest)
}

const copySharedRequest = (payload: {
  sharedRequestID: string | undefined
  content: string | undefined
}) => {
  emit("copy-shared-request", payload)
}

const hideModal = () => {
  emit("hide-modal")
  selectedWidget.value = {
    value: "embed",
    label: t("shared_requests.embed"),
    info: t("shared_requests.embed_info"),
  }
}
</script>
