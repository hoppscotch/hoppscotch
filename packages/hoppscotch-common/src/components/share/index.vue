<template>
  <div>
    <div
      class="sticky top-0 z-10 flex flex-shrink-0 flex-col overflow-x-auto bg-primary"
    >
      <WorkspaceCurrent
        :section="t('tab.shared_requests')"
        :is-only-personal="true"
      />
    </div>
    <div
      class="sticky top-sidebarPrimaryStickyFold z-10 flex flex-1 flex-shrink-0 justify-between overflow-x-auto border-b border-dividerLight bg-primary"
    >
      <HoppButtonSecondary
        :label="t('action.new')"
        :icon="IconPlus"
        class="!rounded-none"
        @click="shareRequest()"
      />
      <HoppButtonSecondary
        v-tippy="{ theme: 'tooltip' }"
        to="https://docs.hoppscotch.io/documentation/features/widgets"
        blank
        :title="t('app.wiki')"
        :icon="IconHelpCircle"
        class="py-2"
      />
    </div>
    <div class="flex flex-col">
      <div v-if="loading" class="flex flex-col items-center justify-center p-4">
        <HoppSmartSpinner class="mb-4" />
        <span class="text-secondaryLight">{{ t("state.loading") }}</span>
      </div>

      <HoppSmartPlaceholder
        v-else-if="!currentUser"
        :src="`/images/states/${colorMode.value}/add_files.svg`"
        :alt="`${t('empty.shared_requests_logout')}`"
        :text="`${t('empty.shared_requests_logout')}`"
      >
        <template #body>
          <HoppButtonPrimary
            :label="t('auth.login')"
            @click="invokeAction('modals.login.toggle')"
          />
        </template>
      </HoppSmartPlaceholder>

      <template v-else-if="sharedRequests.length">
        <ShareRequest
          v-for="request in sharedRequests"
          :key="request.id"
          :request="request"
          @customize-shared-request="customizeSharedRequest"
          @delete-shared-request="deleteSharedRequest"
          @open-shared-request="openRequestInNewTab"
        />
        <HoppSmartIntersection
          v-if="hasMoreSharedRequests"
          @intersecting="loadMoreSharedRequests"
        >
          <div v-if="adapterLoading" class="flex flex-col items-center py-3">
            <HoppSmartSpinner />
          </div>
        </HoppSmartIntersection>
      </template>

      <div v-else-if="adapterError" class="flex flex-col items-center py-4">
        <icon-lucide-help-circle class="svg-icons mb-4" />
        {{ getErrorMessage(adapterError) }}
      </div>

      <HoppSmartPlaceholder
        v-else
        :src="`/images/states/${colorMode.value}/add_files.svg`"
        :alt="`${t('empty.shared_requests')}`"
        :text="t('empty.shared_requests')"
        @drop.stop
      >
        <template #body>
          <HoppButtonPrimary
            :label="t('add.new')"
            :icon="IconPlus"
            @click="shareRequest()"
          />
        </template>
      </HoppSmartPlaceholder>
    </div>
  </div>
  <HoppSmartConfirmModal
    :show="showConfirmModal"
    :title="confirmModalTitle"
    :loading-state="modalLoadingState"
    @hide-modal="showConfirmModal = false"
    @resolve="resolveConfirmModal"
  />
  <ShareModal
    v-if="showShareRequestModal && requestToShare"
    v-model="selectedWidget"
    v-model:embed-options="embedOptions"
    v-model:gql-embed-options="gqlEmbedOptions"
    :step="step"
    :request="requestToShare"
    :show="showShareRequestModal"
    :loading="shareRequestCreatingLoading"
    @hide-modal="displayCustomizeRequestModal(false, null)"
    @copy-shared-request="copySharedRequest"
    @create-shared-request="createSharedRequest"
  />
</template>

<script lang="ts" setup>
import IconHelpCircle from "~icons/lucide/help-circle"
import IconPlus from "~icons/lucide/plus"
import { useI18n } from "~/composables/i18n"
import ShortcodeListAdapter from "~/helpers/shortcode/ShortcodeListAdapter"
import { useReadonlyStream } from "~/composables/stream"
import { onAuthEvent, onLoggedIn } from "~/composables/auth"
import { computed } from "vue"
import { useColorMode } from "~/composables/theming"
import { defineActionHandler, invokeAction } from "~/helpers/actions"
import { platform } from "~/platform"
import { pipe } from "fp-ts/function"
import * as TE from "fp-ts/TaskEither"
import {
  deleteShortcode as backendDeleteShortcode,
  createShortcode,
  updateEmbedProperties,
} from "~/helpers/backend/mutations/Shortcode"
import { GQLError } from "~/helpers/backend/GQLClient"
import { useToast } from "~/composables/toast"
import { ref } from "vue"
import { debounce } from "lodash-es"
import { HoppGQLRequest, HoppRESTRequest } from "@hoppscotch/data"
import { isRESTRequest } from "~/helpers/request-type"
import { copyToClipboard } from "~/helpers/utils/clipboard"
import * as E from "fp-ts/Either"
import { WorkspaceTabsService } from "~/services/tab/workspace-tabs"
import { useService } from "dioc/vue"
import { watch } from "vue"

const t = useI18n()
const colorMode = useColorMode()
const toast = useToast()

const showConfirmModal = ref(false)
const confirmModalTitle = ref("")
const modalLoadingState = ref(false)

const showShareRequestModal = ref(false)

const sharedRequestID = ref("")
const shareRequestCreatingLoading = ref(false)

// The shared-request modal holds either kind. Discriminated downstream via
// the request's shape (`isRESTRequest` / `isGQLRequest`). The CustomizeModal
// is REST-shaped today — GQL goes through its own modal (added in next step).
const requestToShare = ref<HoppRESTRequest | HoppGQLRequest | null>(null)

const embedOptions = ref<EmbedOption>({
  selectedTab: "params",
  tabs: [
    {
      value: "params",
      label: t("tab.parameters"),
      enabled: false,
    },
    {
      value: "bodyParams",
      label: t("tab.body"),
      enabled: false,
    },
    {
      value: "headers",
      label: t("tab.headers"),
      enabled: false,
    },
    {
      value: "authorization",
      label: t("tab.authorization"),
      enabled: false,
    },
    {
      value: "requestVariables",
      label: t("tab.variables"),
      enabled: false,
    },
  ],
  theme: "system",
})

// GraphQL shares use the same modal scaffold but a different tab set —
// kept as a sibling ref so the REST options ref stays untouched and each
// shape has its own translated labels. Initialised lazily; only consumed
// when the active request is GQL.
const gqlEmbedOptions = ref<GQLEmbedOption>({
  selectedTab: "query",
  tabs: [
    {
      value: "query",
      label: t("tab.query"),
      enabled: false,
    },
    {
      value: "variables",
      label: t("tab.variables"),
      enabled: false,
    },
    {
      value: "headers",
      label: t("tab.headers"),
      enabled: false,
    },
    {
      value: "authorization",
      label: t("tab.authorization"),
      enabled: false,
    },
  ],
  theme: "system",
})

const updateEmbedProperty = async (
  shareRequestID: string,
  properties: string
) => {
  const customizeEmbedResult = await updateEmbedProperties(
    shareRequestID,
    properties
  )()

  if (E.isLeft(customizeEmbedResult)) {
    toast.error(`${customizeEmbedResult.left.error}`)
    toast.error(t("error.something_went_wrong"))
  }
}

// Push the current embed customize options to the backend. Called from both
// REST and GQL watchers below; the `options` array contains protocol-specific
// tab values (e.g. "params"/"bodyParams" for REST, "query"/"variables" for
// GQL). The Shortcode.properties column is opaque JSON, so the backend
// accepts either shape — the consumer (the /e/<id> renderer) discriminates
// from the request payload's shape.
// Debounced: the customize modal's checkboxes fire the watcher on every
// click, and without coalescing we'd send one mutation per toggle. 400ms
// is short enough to feel instant on save, long enough to fold a burst of
// toggles into a single network round-trip.
const persistEmbedProperties = debounce(
  (options: { tabs: { enabled: boolean; value: string }[]; theme: string }) => {
    if (
      requestToShare.value &&
      requestToShare.value.id &&
      showShareRequestModal.value &&
      selectedWidget.value.value === "embed"
    ) {
      const properties = {
        options: options.tabs
          .filter((tab) => tab.enabled)
          .map((tab) => tab.value),
        theme: options.theme,
      }
      updateEmbedProperty(requestToShare.value.id, JSON.stringify(properties))
    }
  },
  400
)

// Per-protocol watchers — guarded by the active request's shape so they
// don't double-persist. With a single union ref this guard would be
// unnecessary, but the union shape makes per-modal code messier.
watch(
  () => embedOptions.value,
  () => {
    if (requestToShare.value && isRESTRequest(requestToShare.value)) {
      persistEmbedProperties(embedOptions.value)
    }
  },
  { deep: true }
)

watch(
  () => gqlEmbedOptions.value,
  () => {
    if (requestToShare.value && !isRESTRequest(requestToShare.value)) {
      persistEmbedProperties(gqlEmbedOptions.value)
    }
  },
  { deep: true }
)

const restTab = useService(WorkspaceTabsService)

const currentUser = useReadonlyStream(
  platform.auth.getCurrentUserStream(),
  platform.auth.getCurrentUser()
)

const step = ref(1)

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

// GraphQL embed customize tabs — kept separate from REST so each modal
// owns a clean shape rather than a union with always-undefined fields.
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

type WidgetID = "embed" | "button" | "link"

type Widget = {
  value: WidgetID
  label: string
  info: string
}

const selectedWidget = ref<Widget>({
  value: "embed",
  label: t("shared_requests.embed"),
  info: t("shared_requests.embed_info"),
})

const adapter = new ShortcodeListAdapter(true)
const adapterLoading = useReadonlyStream(adapter.loading$, false)
const adapterError = useReadonlyStream(adapter.error$, null)
const sharedRequests = useReadonlyStream(adapter.shortcodes$, [])
const hasMoreSharedRequests = useReadonlyStream(
  adapter.hasMoreShortcodes$,
  true
)

const loading = computed(
  () => adapterLoading.value && sharedRequests.value.length === 0
)

onLoggedIn(() => {
  if (adapter.isInitialized()) {
    return
  }

  try {
    // wait for a bit to let the auth token to be set
    // because in some race conditions, the token is not set this fixes that
    const initLoadTimeout = setTimeout(() => {
      adapter.initialize()
    }, 10)

    return () => {
      clearTimeout(initLoadTimeout)
    }
  } catch (e) {
    console.error(e)
  }
})

onAuthEvent((ev) => {
  if (ev.event === "logout" && adapter.isInitialized()) {
    adapter.dispose()
    return
  }
})

const shareRequest = () => {
  if (currentUser.value) {
    const tab = restTab.currentActiveTab
    invokeAction("share.request", {
      request: tab.value.document.request,
    })
  } else {
    invokeAction("modals.login.toggle")
  }
}

const deleteSharedRequest = (codeID: string) => {
  if (currentUser.value) {
    sharedRequestID.value = codeID
    confirmModalTitle.value = `${t("confirm.remove_shared_request")}`
    showConfirmModal.value = true
  } else {
    invokeAction("modals.login.toggle")
  }
}

const onDeleteSharedRequest = () => {
  modalLoadingState.value = true
  pipe(
    backendDeleteShortcode(sharedRequestID.value),
    TE.match(
      (err: GQLError<string>) => {
        toast.error(getErrorMessage(err))
        showConfirmModal.value = false
      },
      () => {
        toast.success(t("shared_requests.deleted"))
        sharedRequestID.value = ""
        modalLoadingState.value = false
        showConfirmModal.value = false
      }
    )
  )()
}

const loadMoreSharedRequests = () => {
  adapter.loadMore()
}

const displayShareRequestModal = (show: boolean) => {
  showShareRequestModal.value = show
  step.value = 1
}

const displayCustomizeRequestModal = (
  show: boolean,
  embedProperties?: string | null
) => {
  showShareRequestModal.value = show
  step.value = 2

  // Discriminate by the request currently in flight. `requestToShare` is set
  // before this function is called (by `customizeSharedRequest`), so its
  // shape tells us which embedOptions ref to populate.
  const isGQL = !!requestToShare.value && !isRESTRequest(requestToShare.value)

  if (!embedProperties) {
    selectedWidget.value = {
      value: "button",
      label: t("shared_requests.button"),
      info: t("shared_requests.button_info"),
    }
    if (isGQL) {
      gqlEmbedOptions.value = {
        selectedTab: "query",
        tabs: [
          { value: "query", label: t("tab.query"), enabled: false },
          { value: "variables", label: t("tab.variables"), enabled: false },
          { value: "headers", label: t("tab.headers"), enabled: false },
          {
            value: "authorization",
            label: t("tab.authorization"),
            enabled: false,
          },
        ],
        theme: "system",
      }
    } else {
      embedOptions.value = {
        selectedTab: "params",
        tabs: [
          { value: "params", label: t("tab.parameters"), enabled: false },
          { value: "bodyParams", label: t("tab.body"), enabled: false },
          { value: "headers", label: t("tab.headers"), enabled: false },
          {
            value: "authorization",
            label: t("tab.authorization"),
            enabled: false,
          },
          {
            value: "requestVariables",
            label: t("tab.variables"),
            enabled: false,
          },
        ],
        theme: "system",
      }
    }
    return
  }

  const parsedEmbedProperties = JSON.parse(embedProperties)
  if (isGQL) {
    gqlEmbedOptions.value = {
      selectedTab: parsedEmbedProperties.options[0],
      tabs: gqlEmbedOptions.value.tabs.map((tab) => ({
        ...tab,
        enabled: parsedEmbedProperties.options.includes(tab.value),
      })),
      theme: parsedEmbedProperties.theme,
    }
  } else {
    embedOptions.value = {
      selectedTab: parsedEmbedProperties.options[0],
      tabs: embedOptions.value.tabs.map((tab) => ({
        ...tab,
        enabled: parsedEmbedProperties.options.includes(tab.value),
      })),
      theme: parsedEmbedProperties.theme,
    }
  }
}

const createSharedRequest = async (
  request: HoppRESTRequest | HoppGQLRequest | null
) => {
  if (!request || !selectedWidget.value) return

  const isGQL = !isRESTRequest(request)

  // Default embed tab set per protocol. The values must match the tab.value
  // strings used by each CustomizeModal so the round-trip through
  // `embedProperties` correctly toggles checkboxes on later loads.
  const defaultEmbedOptions = isGQL
    ? ["query", "variables", "headers"]
    : ["parameters", "body", "headers"]

  const properties = {
    options: defaultEmbedOptions,
    theme: "system",
  }

  shareRequestCreatingLoading.value = true
  const sharedRequestResult = await createShortcode(
    request,
    selectedWidget.value.value === "embed"
      ? JSON.stringify(properties)
      : undefined
  )()

  platform.analytics?.logEvent({
    type: "HOPP_SHORTCODE_CREATED",
  })

  if (E.isLeft(sharedRequestResult)) {
    toast.error(`${sharedRequestResult.left.error}`)
    toast.error(t("error.something_went_wrong"))
    return
  }

  if (!sharedRequestResult.right.createShortcode) return

  shareRequestCreatingLoading.value = false
  requestToShare.value = {
    ...JSON.parse(sharedRequestResult.right.createShortcode.request),
    id: sharedRequestResult.right.createShortcode.id,
  }
  step.value = 2

  if (!sharedRequestResult.right.createShortcode.properties) return

  const parsedEmbedProperties = JSON.parse(
    sharedRequestResult.right.createShortcode.properties
  )

  // Hydrate the matching options ref so the customize modal opens with
  // the just-saved selections.
  if (isGQL) {
    gqlEmbedOptions.value = {
      selectedTab: parsedEmbedProperties.options[0],
      tabs: gqlEmbedOptions.value.tabs.map((tab) => ({
        ...tab,
        enabled: parsedEmbedProperties.options.includes(tab.value),
      })),
      theme: parsedEmbedProperties.theme,
    }
  } else {
    embedOptions.value = {
      selectedTab: parsedEmbedProperties.options[0],
      tabs: embedOptions.value.tabs.map((tab) => ({
        ...tab,
        enabled: parsedEmbedProperties.options.includes(tab.value),
      })),
      theme: parsedEmbedProperties.theme,
    }
  }
}

const customizeSharedRequest = (
  request: HoppRESTRequest | HoppGQLRequest,
  shredRequestID: string,
  embedProperties?: string | null
) => {
  requestToShare.value = {
    ...request,
    id: shredRequestID,
  }
  displayCustomizeRequestModal(true, embedProperties)
}

const copySharedRequest = (payload: {
  sharedRequestID: string | undefined
  content: string | undefined
}) => {
  if (payload.content) {
    copyToClipboard(payload.content)
    toast.success(t("state.copied_to_clipboard"))
  }
}

const resolveConfirmModal = (title: string | null) => {
  if (title === `${t("confirm.remove_shared_request")}`) onDeleteSharedRequest()
  else {
    console.error(
      `Confirm modal title ${title} is not handled by the component`
    )
    toast.error(t("error.something_went_wrong"))
    showConfirmModal.value = false
    sharedRequestID.value = ""
  }
}

const getErrorMessage = (err: GQLError<string>) => {
  if (err.type === "network_error") {
    return t("error.network_error")
  }
  switch (err.error) {
    case "shortcode/not_found":
      return t("shared_requests.not_found")
    default:
      return t("error.something_went_wrong")
  }
}

const openRequestInNewTab = (request: HoppRESTRequest | HoppGQLRequest) => {
  if (isRESTRequest(request)) {
    restTab.createNewTab({
      isDirty: false,
      request: request as HoppRESTRequest,
      type: "request",
    })
    return
  }
  // GraphQL shortcode — open as a gql-request tab in the unified workspace.
  restTab.createNewTab({
    isDirty: false,
    request: request as HoppGQLRequest,
    type: "gql-request",
    cursorPosition: 0,
  })
}

defineActionHandler("share.request", ({ request }) => {
  requestToShare.value = request
  displayShareRequestModal(true)
})
</script>
