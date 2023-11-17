<template>
  <HoppSmartModal
    v-if="show"
    dialog
    :title="t('modal.share_request')"
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
        :request="request"
        :loading="loading"
        @copy-shared-request="copySharedRequest"
      />
    </template>

    <template #footer>
      <div v-if="step === 1" class="flex justify-end">
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
      <HoppButtonPrimary v-else :label="t('action.close')" @click="hideModal" />
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
  step: {
    type: Number,
    default: 1,
  },
})

type WidgetID = "embed" | "button" | "link"

type Widget = {
  value: WidgetID
  label: string
  info: string
}

const selectedWidget = useVModel(props, "modelValue")

const emit = defineEmits<{
  (e: "create-shared-request", request: HoppRESTRequest | null): void
  (e: "hide-modal"): void
  (e: "update:modelValue", value: string): void
  (e: "update:step", value: number): void
  (
    e: "copy-shared-request",
    request: {
      sharedRequestID: string | undefined
      content: string | undefined
    }
  ): void
}>()

const createSharedRequest = () => {
  emit("create-shared-request", props.request as HoppRESTRequest)
}

const copySharedRequest = (request: {
  sharedRequestID: string | undefined
  content: string | undefined
}) => {
  emit("copy-shared-request", request)
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
