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
      class="sticky top-sidebarPrimaryStickyFold z-10 flex flex-1 flex-shrink-0 justify-end overflow-x-auto border-b border-dividerLight bg-primary"
    >
      <HoppButtonSecondary
        v-tippy="{ theme: 'tooltip' }"
        to="https://docs.hoppscotch.io/documentation/features/shared-request"
        blank
        :title="t('app.wiki')"
        :icon="IconHelpCircle"
        class="py-2"
      />
    </div>
    <div class="flex flex-col">
      <div v-if="loading" class="flex flex-col items-center justify-center">
        <HoppSmartSpinner class="mb-4" />
        <span class="text-secondaryLight">{{ t("state.loading") }}</span>
      </div>

      <HoppSmartPlaceholder
        v-else-if="!currentUser"
        :src="`/images/states/${colorMode.value}/add_files.svg`"
        :alt="`${t('empty.shared_requests_logout')}`"
        :text="`${t('empty.shared_requests_logout')}`"
      >
        <HoppButtonPrimary
          :label="t('auth.login')"
          @click="invokeAction('modals.login.toggle')"
        />
      </HoppSmartPlaceholder>

      <template v-else-if="sharedRequests.length">
        <ShareRequest
          v-for="request in sharedRequests"
          :key="request.id"
          :request="request"
          @customize-shared-request="customizeSharedRequest"
          @delete-shared-request="deleteSharedRequest"
          @open-new-tab="openInNewTab"
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
      />
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
    v-model="selectedWidget"
    :request="requestToShare"
    :show="showShareRequestModal"
    :loading="shareRequestCreatingLoading"
    :step="step"
    @hide-modal="displayCustomizeRequestModal(false)"
    @copy-shared-request="copySharedRequest"
    @create-shared-request="createSharedRequest"
  />
</template>

<script lang="ts" setup>
import IconHelpCircle from "~icons/lucide/help-circle"
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
} from "~/helpers/backend/mutations/Shortcode"
import { GQLError } from "~/helpers/backend/GQLClient"
import { useToast } from "~/composables/toast"
import { ref } from "vue"
import { HoppRESTRequest } from "@hoppscotch/data"
import { copyToClipboard } from "~/helpers/utils/clipboard"
import * as E from "fp-ts/Either"
import { RESTTabService } from "~/services/tab/rest"
import { useService } from "dioc/vue"

const t = useI18n()
const colorMode = useColorMode()
const toast = useToast()

const showConfirmModal = ref(false)
const confirmModalTitle = ref("")
const modalLoadingState = ref(false)

const showShareRequestModal = ref(false)

const sharedRequestID = ref("")
const shareRequestCreatingLoading = ref(false)

const requestToShare = ref<HoppRESTRequest | null>(null)

const restTab = useService(RESTTabService)

const currentUser = useReadonlyStream(
  platform.auth.getCurrentUserStream(),
  platform.auth.getCurrentUser()
)

const step = ref(1)

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
  try {
    adapter.initialize()
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
const displayCustomizeRequestModal = (show: boolean) => {
  showShareRequestModal.value = show
  step.value = 2
}

const createSharedRequest = async (request: HoppRESTRequest | null) => {
  if (request && selectedWidget.value) {
    shareRequestCreatingLoading.value = true
    const sharedRequestResult = await createShortcode(request)()

    platform.analytics?.logEvent({
      type: "HOPP_SHORTCODE_CREATED",
    })

    if (E.isLeft(sharedRequestResult)) {
      toast.error(`${sharedRequestResult.left.error}`)
      toast.error(t("error.something_went_wrong"))
    } else if (E.isRight(sharedRequestResult)) {
      if (sharedRequestResult.right.createShortcode) {
        shareRequestCreatingLoading.value = false
        requestToShare.value = {
          ...JSON.parse(sharedRequestResult.right.createShortcode.request),
          id: sharedRequestResult.right.createShortcode.id,
        }
        step.value = 2
      }
    }
  }
}

const customizeSharedRequest = (
  request: HoppRESTRequest,
  shredRequestID: string
) => {
  requestToShare.value = {
    ...request,
    id: shredRequestID,
  }
  displayCustomizeRequestModal(true)
}

const copySharedRequest = (request: {
  sharedRequestID: string | undefined
  content: string | undefined
}) => {
  if (request.content) {
    copyToClipboard(request.content)
    toast.success(t("state.copied_to_clipboard"))
  }
}

const openInNewTab = (request: HoppRESTRequest) => {
  restTab.createNewTab({
    isDirty: false,
    request,
  })
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
  } else {
    switch (err.error) {
      case "shortcode/not_found":
        return t("shared_request.not_found")
      default:
        return t("error.something_went_wrong")
    }
  }
}

defineActionHandler("share.request", ({ request }) => {
  requestToShare.value = request
  displayShareRequestModal(true)
})
</script>
