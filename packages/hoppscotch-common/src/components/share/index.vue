<template>
  <div>
    <div
      class="sticky top-0 z-10 flex flex-col flex-shrink-0 overflow-x-auto bg-primary"
    >
      <WorkspaceCurrent
        :section="t('tab.shared_requests')"
        :is-only-personal="true"
      />
    </div>
    <div
      class="sticky z-10 flex justify-end flex-1 flex-shrink-0 overflow-x-auto border-b top-sidebarPrimaryStickyFold border-dividerLight bg-primary"
    >
      <!-- <HoppButtonSecondary
        :icon="IconPlus"
        :label="`${t('action.new')}`"
        class="!rounded-none"
        @click="shareRequest()"
      /> -->
      <HoppButtonSecondary
        v-tippy="{ theme: 'tooltip' }"
        to="https://docs.hoppscotch.io/documentation/features/environments"
        blank
        :title="t('app.wiki')"
        :icon="IconHelpCircle"
        class="py-2"
      />
    </div>
    <div class="flex flex-col">
      <div v-if="loading"></div>
      <div v-if="myShortcodes && myShortcodes.length > 0">
        <ShareRequest
          v-for="request in myShortcodes"
          :key="request.id"
          :request="request"
          @delete-shared-request="deleteSharedRequest"
          @customize-shared-request="customizeSharedRequest"
        />
      </div>
      <HoppSmartPlaceholder
        v-else
        :src="`/images/states/${colorMode.value}/add_files.svg`"
        :alt="`${t('empty.shared_requests')}`"
        :text="t('empty.shared_requests')"
        @drop.stop
      >
        <!-- <HoppButtonSecondary
          :icon="IconPlus"
          :label="t('add.new')"
          filled
          outline
          @click="shareRequest()"
        /> -->
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
  <ShareRequestModal
    v-model="selectedWidget"
    :request="requestToCreate"
    :show="showSharedRequestModal"
    :loading="shareRequestCreatingLoading"
    @hide-modal="displayShareRequestModal(false)"
    @create-shared-request="createSharedRequest"
  />
</template>

<script lang="ts" setup>
import IconHelpCircle from "~icons/lucide/help-circle"
import { useI18n } from "~/composables/i18n"
import ShortcodeListAdapter from "~/helpers/shortcodes/ShortcodeListAdapter"
import { useReadonlyStream } from "~/composables/stream"
import { onAuthEvent, onLoggedIn } from "~/composables/auth"
import { computed } from "vue"
import { useColorMode } from "~/composables/theming"
import { defineActionHandler } from "~/helpers/actions"
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

const t = useI18n()
const colorMode = useColorMode()
const toast = useToast()

const showConfirmModal = ref(false)
const confirmModalTitle = ref("")
const modalLoadingState = ref(false)

const showSharedRequestModal = ref(false)

const sharedRequestID = ref("")
const shareRequestCreatingLoading = ref(false)

const requestToCreate = ref<HoppRESTRequest | null>(null)
type WidgetID = "embed" | "button" | "link"

type Widget = {
  id: WidgetID
  name: string
  info: string
}

const selectedWidget = ref<Widget>({
  id: "embed",
  name: t("shared_requests.embed"),
  info: "Embed is the best way to share your request",
})

// const currentUser = useReadonlyStream(
//   platform.auth.getCurrentUserStream(),
//   platform.auth.getCurrentUser()
// )

// const shareRequest = () => {
//   if (currentUser.value) {
//     console.log("shareRequest")
//     displayShareRequestModal(true)
//   } else {
//     invokeAction("modals.login.toggle")
//   }
// }

const adapter = new ShortcodeListAdapter(true)
const adapterLoading = useReadonlyStream(adapter.loading$, false)
// const adapterError = useReadonlyStream(adapter.error$, null)
const myShortcodes = useReadonlyStream(adapter.shortcodes$, [])
// const hasMoreShortcodes = useReadonlyStream(adapter.hasMoreShortcodes$, true)

const loading = computed(
  () => adapterLoading.value && myShortcodes.value.length === 0
)

onLoggedIn(() => {
  try {
    adapter.initialize()
  } catch (e) {}
})

onAuthEvent((ev) => {
  if (ev.event === "logout" && adapter.isInitialized()) {
    adapter.dispose()
    return
  }
})

const deleteSharedRequest = (codeID: string) => {
  sharedRequestID.value = codeID
  confirmModalTitle.value = `${t("confirm.remove_shared_request")}`
  showConfirmModal.value = true
}

const onDeleteSharedRequest = () => {
  modalLoadingState.value = true
  pipe(
    backendDeleteShortcode(sharedRequestID.value),
    TE.match(
      (err: GQLError<string>) => {
        toast.error(`${getErrorMessage(err)}`)
        showConfirmModal.value = false
      },
      () => {
        toast.success(`${t("shared_requests.deleted")}`)
        sharedRequestID.value = ""
        modalLoadingState.value = false
        showConfirmModal.value = false
      }
    )
  )()
}

const customizeSharedRequest = () => {
  console.log("customizeSharedRequest")
}

const displayShareRequestModal = (show: boolean) => {
  showSharedRequestModal.value = show
}

const createSharedRequest = async (request: HoppRESTRequest | null) => {
  if (request && selectedWidget.value) {
    console.log("createSharedRequest", request, selectedWidget.value.id)
    shareRequestCreatingLoading.value = true
    const shortcodeResult = await createShortcode(request)()

    platform.analytics?.logEvent({
      type: "HOPP_SHORTCODE_CREATED",
    })

    if (E.isLeft(shortcodeResult)) {
      toast.error(`${shortcodeResult.left.error}`)
      toast.error(`${t("error.something_went_wrong")}`)
    } else if (E.isRight(shortcodeResult)) {
      const shareLink = getWidgetCopyLink(
        selectedWidget.value.id,
        shortcodeResult.right.createShortcode.id
      )
      if (shareLink) copyShareLink(shareLink)

      shareRequestCreatingLoading.value = false
      displayShareRequestModal(false)
    }
  }
}

const getWidgetCopyLink = (type: Widget["id"], id: string) => {
  const baseURL = import.meta.env.VITE_SHORTCODE_BASE_URL ?? "https://hopp.sh"
  if (type === "embed") {
    return `<iframe src="${baseURL}/e/${id}" style={{
    width: "100%",
    height: 900,
    outline: "1px solid #252525",
  }}></iframe>`
  } else if (type === "button") {
    return `<a href="${baseURL}/r/${id}" target="_blank"><img src="${baseURL}/images/button.svg" alt="Run in Hoppscotch" /></a>`
  } else if (type === "link") {
    return `${baseURL}/r/${id}`
  } else {
    return ""
  }
}

const copyShareLink = (shareLink: string) => {
  console.log("copied-to-clipboard", shareLink)

  copyToClipboard(shareLink)
  toast.success(`${t("state.copied_to_clipboard")}`)
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
        return t("shortcodes.not_found")
      default:
        return t("error.something_went_wrong")
    }
  }
}

defineActionHandler("share.request", ({ request }) => {
  console.log("open-modal-req", request)
  requestToCreate.value = request
  displayShareRequestModal(true)
})
</script>
