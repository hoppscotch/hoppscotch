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
      <div
        v-if="hasSharedSecrets"
        class="mb-3 flex items-start gap-2 rounded border border-yellow-500/40 bg-yellow-500/10 px-3 py-2 text-tiny text-yellow-700 dark:text-yellow-400"
        data-testid="share_secret_warning"
      >
        <icon-lucide-alert-triangle class="mt-0.5 h-3 w-3 flex-shrink-0" />
        <span>
          {{ t("shared_requests.auth_warning") }}
        </span>
      </div>
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
        v-else-if="step === 2 && request && isRESTRequest(request)"
        v-model="selectedWidget"
        v-model:embed-options="embedOptions"
        :request="request as HoppRESTRequest"
        :loading="loading"
        @copy-shared-request="copySharedRequest"
      />
      <ShareCustomizeGQLModal
        v-else-if="step === 2 && request"
        v-model="selectedWidget"
        v-model:embed-options="gqlEmbedOptions"
        :request="request as HoppGQLRequest"
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
import { HoppGQLRequest, HoppRESTRequest } from "@hoppscotch/data"
import { useVModel } from "@vueuse/core"
import { computed, PropType } from "vue"
import { useI18n } from "~/composables/i18n"
import { isRESTRequest, requestHasSharedSecrets } from "~/helpers/request-type"

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

// GraphQL-shaped embed options — separate from REST because the tab set
// differs. Kept as a sibling prop so each customize component owns a clean,
// non-union shape and we don't carry stale REST fields onto a GQL share.
type GQLEmbedTabs = "query" | "variables" | "headers" | "authorization"

type GQLEmbedOption = {
  selectedTab: GQLEmbedTabs
  tabs: {
    value: GQLEmbedTabs
    label: string
    enabled: boolean
  }[]
  theme: "light" | "dark" | "system"
}

const props = defineProps({
  request: {
    type: Object as PropType<HoppRESTRequest | HoppGQLRequest | null>,
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
  gqlEmbedOptions: {
    type: Object as PropType<GQLEmbedOption>,
    default: () => ({
      selectedTab: "query",
      tabs: [
        {
          value: "query",
          label: "tab.query",
          enabled: true,
        },
        {
          value: "variables",
          label: "tab.variables",
          enabled: true,
        },
        {
          value: "headers",
          label: "tab.headers",
          enabled: true,
        },
        {
          value: "authorization",
          label: "tab.authorization",
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
const gqlEmbedOptions = useVModel(props, "gqlEmbedOptions")

const emit = defineEmits<{
  (
    e: "create-shared-request",
    request: HoppRESTRequest | HoppGQLRequest | null
  ): void
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

// Show a warning when the request carries active auth credentials. The
// `Shortcode.request` column on the backend is opaque JSON and readable by
// anyone with the code, so a bearer token / password / API key in the
// payload becomes public the moment the shortcode is created. Disabling
// the Authorization toggle in customize only hides it from the embed UI,
// not from the stored payload.
const hasSharedSecrets = computed(() =>
  props.request ? requestHasSharedSecrets(props.request) : false
)

const createSharedRequest = () => {
  emit("create-shared-request", props.request)
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
