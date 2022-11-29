<template>
  <div
    class="sticky top-0 z-20 flex-none p-4 overflow-x-auto sm:flex sm:flex-shrink-0 sm:space-x-2 bg-primary"
  >
    <div
      class="flex flex-1 border rounded min-w-52 border-divider whitespace-nowrap"
    >
      <div class="relative flex">
        <label for="method">
          <tippy
            interactive
            trigger="click"
            theme="popover"
            :on-shown="() => methodTippyActions.focus()"
          >
            <span class="select-wrapper">
              <input
                id="method"
                class="flex px-4 py-2 font-semibold transition rounded-l cursor-pointer text-secondaryDark w-26 bg-primaryLight"
                :value="newMethod"
                :readonly="!isCustomMethod"
                :placeholder="`${t('request.method')}`"
                @input="onSelectMethod($event.target.value)"
              />
            </span>
            <template #content="{ hide }">
              <div
                ref="methodTippyActions"
                class="flex flex-col focus:outline-none"
                tabindex="0"
                @keyup.escape="hide()"
              >
                <SmartItem
                  v-for="(method, index) in methods"
                  :key="`method-${index}`"
                  :label="method"
                  @click="
                    () => {
                      onSelectMethod(method)
                      hide()
                    }
                  "
                />
              </div>
            </template>
          </tippy>
        </label>
      </div>
      <div
        class="flex flex-1 overflow-auto transition border-l rounded-r border-divider bg-primaryLight whitespace-nowrap"
      >
        <SmartEnvInput
          v-model="newEndpoint"
          :placeholder="`${t('request.url')}`"
          @enter="newSendRequest()"
          @paste="onPasteUrl($event)"
        />
      </div>
    </div>
    <div class="flex mt-2 sm:mt-0">
      <ButtonPrimary
        id="send"
        v-tippy="{ theme: 'tooltip', delay: [500, 20], allowHTML: true }"
        :title="`${t('action.send')} <kbd>${getSpecialKey()}</kbd><kbd>↩</kbd>`"
        :label="`${!loading ? t('action.send') : t('action.cancel')}`"
        class="flex-1 rounded-r-none min-w-20"
        @click="!loading ? newSendRequest() : cancelRequest()"
      />
      <span class="flex">
        <tippy
          interactive
          trigger="click"
          theme="popover"
          :on-shown="() => sendTippyActions.focus()"
        >
          <ButtonPrimary
            v-tippy="{ theme: 'tooltip' }"
            :title="t('app.options')"
            :icon="IconChevronDown"
            filled
            class="rounded-l-none"
          />
          <template #content="{ hide }">
            <div
              ref="sendTippyActions"
              class="flex flex-col focus:outline-none"
              tabindex="0"
              @keyup.c="curl.$el.click()"
              @keyup.s="show.$el.click()"
              @keyup.delete="clearAll.$el.click()"
              @keyup.escape="hide()"
            >
              <SmartItem
                ref="curl"
                :label="`${t('import.curl')}`"
                :icon="IconFileCode"
                :shortcut="['C']"
                @click="
                  () => {
                    showCurlImportModal = !showCurlImportModal
                    hide()
                  }
                "
              />
              <SmartItem
                ref="show"
                :label="`${t('show.code')}`"
                :icon="IconCode2"
                :shortcut="['S']"
                @click="
                  () => {
                    showCodegenModal = !showCodegenModal
                    hide()
                  }
                "
              />
              <SmartItem
                ref="clearAll"
                :label="`${t('action.clear_all')}`"
                :icon="IconRotateCCW"
                :shortcut="['⌫']"
                @click="
                  () => {
                    clearContent()
                    hide()
                  }
                "
              />
            </div>
          </template>
        </tippy>
      </span>
      <span
        class="flex ml-2 transition border rounded border-dividerLight hover:border-dividerDark"
      >
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip', delay: [500, 20], allowHTML: true }"
          :title="`${t(
            'request.save'
          )} <kbd>${getSpecialKey()}</kbd><kbd>S</kbd>`"
          :label="COLUMN_LAYOUT ? `${t('request.save')}` : ''"
          filled
          :icon="IconSave"
          class="flex-1 rounded rounded-r-none"
          @click="saveRequest()"
        />
        <span class="flex">
          <tippy
            interactive
            trigger="click"
            theme="popover"
            :on-shown="() => saveTippyActions.focus()"
          >
            <ButtonSecondary
              v-tippy="{ theme: 'tooltip' }"
              :title="t('app.options')"
              :icon="IconChevronDown"
              filled
              class="rounded rounded-l-none"
            />
            <template #content="{ hide }">
              <div
                ref="saveTippyActions"
                class="flex flex-col focus:outline-none"
                tabindex="0"
                @keyup.c="copyRequestAction.$el.click()"
                @keyup.s="saveRequestAction.$el.click()"
                @keyup.escape="hide()"
              >
                <input
                  id="request-name"
                  v-model="requestName"
                  :placeholder="`${t('request.name')}`"
                  name="request-name"
                  type="text"
                  autocomplete="off"
                  class="mb-2 input !bg-primaryContrast"
                  @keyup.enter="hide()"
                />
                <SmartItem
                  ref="copyRequestAction"
                  :label="shareButtonText"
                  :icon="copyLinkIcon"
                  :loading="fetchingShareLink"
                  :shortcut="['C']"
                  @click="
                    () => {
                      copyRequest()
                    }
                  "
                />
                <SmartItem
                  :icon="IconLink2"
                  :label="`${t('request.view_my_links')}`"
                  to="/profile"
                />
                <hr />
                <SmartItem
                  ref="saveRequestAction"
                  :label="`${t('request.save_as')}`"
                  :icon="IconFolderPlus"
                  :shortcut="['S']"
                  @click="
                    () => {
                      showSaveRequestModal = true
                      hide()
                    }
                  "
                />
              </div>
            </template>
          </tippy>
        </span>
      </span>
    </div>
    <HttpImportCurl
      :text="curlText"
      :show="showCurlImportModal"
      @hide-modal="showCurlImportModal = false"
    />
    <HttpCodegenModal
      :show="showCodegenModal"
      @hide-modal="showCodegenModal = false"
    />
    <CollectionsSaveRequest
      mode="rest"
      :show="showSaveRequestModal"
      @hide-modal="showSaveRequestModal = false"
    />
  </div>
</template>

<script setup lang="ts">
import IconShare2 from "~icons/lucide/share-2"
import IconCopy from "~icons/lucide/copy"
import IconCheck from "~icons/lucide/check"
import IconFileCode from "~icons/lucide/file-code"
import IconCode2 from "~icons/lucide/code-2"
import IconRotateCCW from "~icons/lucide/rotate-ccw"
import IconSave from "~icons/lucide/save"
import IconChevronDown from "~icons/lucide/chevron-down"
import IconLink2 from "~icons/lucide/link-2"
import IconFolderPlus from "~icons/lucide/folder-plus"
import { computed, ref, watch } from "vue"
import { isLeft, isRight } from "fp-ts/lib/Either"
import * as E from "fp-ts/Either"
import { cloneDeep } from "lodash-es"
import { refAutoReset } from "@vueuse/core"
import {
  updateRESTResponse,
  restEndpoint$,
  setRESTEndpoint,
  restMethod$,
  updateRESTMethod,
  resetRESTRequest,
  useRESTRequestName,
  getRESTSaveContext,
  getRESTRequest,
  restRequest$,
  setRESTSaveContext,
} from "~/newstore/RESTSession"
import { editRESTRequest } from "~/newstore/collections"
import { runRESTRequest$ } from "~/helpers/RequestRunner"
import {
  useStream,
  useStreamSubscriber,
  useReadonlyStream,
} from "@composables/stream"
import { useI18n } from "@composables/i18n"
import { useToast } from "@composables/toast"
import { useSetting } from "@composables/settings"
import { startPageProgress, completePageProgress } from "@modules/loadingbar"
import { defineActionHandler } from "~/helpers/actions"
import { copyToClipboard } from "~/helpers/utils/clipboard"
import { createShortcode } from "~/helpers/backend/mutations/Shortcode"
import { runMutation } from "~/helpers/backend/GQLClient"
import { UpdateRequestDocument } from "~/helpers/backend/graphql"
import { getPlatformSpecialKey as getSpecialKey } from "~/helpers/platformutils"

const t = useI18n()

const methods = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "CONNECT",
  "OPTIONS",
  "TRACE",
  "CUSTOM",
]

const toast = useToast()

const { subscribeToStream } = useStreamSubscriber()

const newEndpoint = useStream(restEndpoint$, "", setRESTEndpoint)
const curlText = ref("")
const newMethod = useStream(restMethod$, "", updateRESTMethod)

const loading = ref(false)

const showCurlImportModal = ref(false)
const showCodegenModal = ref(false)
const showSaveRequestModal = ref(false)

const hasNavigatorShare = !!navigator.share

// Template refs
const methodTippyActions = ref<any | null>(null)
const sendTippyActions = ref<any | null>(null)
const saveTippyActions = ref<any | null>(null)
const curl = ref<any | null>(null)
const show = ref<any | null>(null)
const clearAll = ref<any | null>(null)
const copyRequestAction = ref<any | null>(null)
const saveRequestAction = ref<any | null>(null)

// Update Nuxt Loading bar
watch(loading, () => {
  if (loading.value) {
    startPageProgress()
  } else {
    completePageProgress()
  }
})

const newSendRequest = async () => {
  if (newEndpoint.value === "" || /^\s+$/.test(newEndpoint.value)) {
    toast.error(`${t("empty.endpoint")}`)
    return
  }

  ensureMethodInEndpoint()

  loading.value = true

  // Double calling is because the function returns a TaskEither than should be executed
  const streamResult = await runRESTRequest$()()

  if (isRight(streamResult)) {
    subscribeToStream(
      streamResult.right,
      (responseState) => {
        if (loading.value) {
          // Check exists because, loading can be set to false
          // when cancelled
          updateRESTResponse(responseState)
        }
      },
      () => {
        loading.value = false
      },
      () => {
        loading.value = false
      }
    )
  } else if (isLeft(streamResult)) {
    loading.value = false
    toast.error(`${t("error.script_fail")}`)
    let error: Error
    if (typeof streamResult.left === "string") {
      error = { name: "RequestFailure", message: streamResult.left }
    } else {
      error = streamResult.left
    }
    updateRESTResponse({
      type: "script_fail",
      error,
    })
  }
}

const ensureMethodInEndpoint = () => {
  if (
    !/^http[s]?:\/\//.test(newEndpoint.value) &&
    !newEndpoint.value.startsWith("<<")
  ) {
    const domain = newEndpoint.value.split(/[/:#?]+/)[0]
    if (domain === "localhost" || /([0-9]+\.)*[0-9]/.test(domain)) {
      setRESTEndpoint("http://" + newEndpoint.value)
    } else {
      setRESTEndpoint("https://" + newEndpoint.value)
    }
  }
}

const onPasteUrl = (e: { pastedValue: string; prevValue: string }) => {
  if (!e) return

  const pastedData = e.pastedValue

  if (isCURL(pastedData)) {
    showCurlImportModal.value = true
    curlText.value = pastedData
    newEndpoint.value = e.prevValue
  }
}

function isCURL(curl: string) {
  return curl.includes("curl ")
}

const cancelRequest = () => {
  loading.value = false
  updateRESTResponse(null)
}

const updateMethod = (method: string) => {
  updateRESTMethod(method)
}

const onSelectMethod = (method: string) => {
  updateMethod(method)
}

const clearContent = () => {
  resetRESTRequest()
}

const copyLinkIcon = refAutoReset<
  typeof IconShare2 | typeof IconCopy | typeof IconCheck
>(hasNavigatorShare ? IconShare2 : IconCopy, 1000)

const shareLink = ref<string | null>("")
const fetchingShareLink = ref(false)

const shareButtonText = computed(() => {
  if (shareLink.value) {
    return shareLink.value
  } else if (fetchingShareLink.value) {
    return t("state.loading")
  } else {
    return t("request.copy_link")
  }
})

const request = useReadonlyStream(restRequest$, getRESTRequest())

watch(request, () => {
  shareLink.value = null
})

const copyRequest = async () => {
  if (shareLink.value) {
    copyShareLink(shareLink.value)
  } else {
    shareLink.value = ""
    fetchingShareLink.value = true
    const request = getRESTRequest()
    const shortcodeResult = await createShortcode(request)()
    if (E.isLeft(shortcodeResult)) {
      toast.error(`${shortcodeResult.left.error}`)
      shareLink.value = `${t("error.something_went_wrong")}`
    } else if (E.isRight(shortcodeResult)) {
      shareLink.value = `/${shortcodeResult.right.createShortcode.id}`
      copyShareLink(shareLink.value)
    }
    fetchingShareLink.value = false
  }
}

const copyShareLink = (shareLink: string) => {
  const link = `${
    import.meta.env.VITE_SHORTCODE_BASE_URL ?? "https://hopp.sh"
  }/r${shareLink}`
  if (navigator.share) {
    const time = new Date().toLocaleTimeString()
    const date = new Date().toLocaleDateString()
    navigator.share({
      title: "Hoppscotch",
      text: `Hoppscotch • Open source API development ecosystem at ${time} on ${date}`,
      url: link,
    })
  } else {
    copyLinkIcon.value = IconCheck
    copyToClipboard(link)
    toast.success(`${t("state.copied_to_clipboard")}`)
  }
}

const cycleUpMethod = () => {
  const currentIndex = methods.indexOf(newMethod.value)
  if (currentIndex === -1) {
    // Most probs we are in CUSTOM mode
    // Cycle up from CUSTOM is PATCH
    updateMethod("PATCH")
  } else if (currentIndex === 0) {
    updateMethod("CUSTOM")
  } else {
    updateMethod(methods[currentIndex - 1])
  }
}

const cycleDownMethod = () => {
  const currentIndex = methods.indexOf(newMethod.value)
  if (currentIndex === -1) {
    // Most probs we are in CUSTOM mode
    // Cycle down from CUSTOM is GET
    updateMethod("GET")
  } else if (currentIndex === methods.length - 1) {
    updateMethod("GET")
  } else {
    updateMethod(methods[currentIndex + 1])
  }
}

const saveRequest = () => {
  const saveCtx = getRESTSaveContext()
  if (!saveCtx) {
    showSaveRequestModal.value = true
    return
  }
  if (saveCtx.originLocation === "user-collection") {
    const req = getRESTRequest()

    try {
      editRESTRequest(
        saveCtx.folderPath,
        saveCtx.requestIndex,
        getRESTRequest()
      )
      setRESTSaveContext({
        originLocation: "user-collection",
        folderPath: saveCtx.folderPath,
        requestIndex: saveCtx.requestIndex,
        req: cloneDeep(req),
      })
      toast.success(`${t("request.saved")}`)
    } catch (e) {
      setRESTSaveContext(null)
      saveRequest()
    }
  } else if (saveCtx.originLocation === "team-collection") {
    const req = getRESTRequest()

    // TODO: handle error case (NOTE: overwriteRequestTeams is async)
    try {
      runMutation(UpdateRequestDocument, {
        requestID: saveCtx.requestID,
        data: {
          title: req.name,
          request: JSON.stringify(req),
        },
      })().then((result) => {
        if (E.isLeft(result)) {
          toast.error(`${t("profile.no_permission")}`)
        } else {
          setRESTSaveContext({
            originLocation: "team-collection",
            requestID: saveCtx.requestID,
            req: cloneDeep(req),
          })
          toast.success(`${t("request.saved")}`)
        }
      })
    } catch (error) {
      showSaveRequestModal.value = true
      toast.error(`${t("error.something_went_wrong")}`)
      console.error(error)
    }
  }
}

defineActionHandler("request.send-cancel", () => {
  if (!loading.value) newSendRequest()
  else cancelRequest()
})
defineActionHandler("request.reset", clearContent)
defineActionHandler("request.copy-link", copyRequest)
defineActionHandler("request.method.next", cycleDownMethod)
defineActionHandler("request.method.prev", cycleUpMethod)
defineActionHandler("request.save", saveRequest)
defineActionHandler(
  "request.save-as",
  () => (showSaveRequestModal.value = true)
)
defineActionHandler("request.method.get", () => updateMethod("GET"))
defineActionHandler("request.method.post", () => updateMethod("POST"))
defineActionHandler("request.method.put", () => updateMethod("PUT"))
defineActionHandler("request.method.delete", () => updateMethod("DELETE"))
defineActionHandler("request.method.head", () => updateMethod("HEAD"))

const isCustomMethod = computed(() => {
  return newMethod.value === "CUSTOM" || !methods.includes(newMethod.value)
})

const requestName = useRESTRequestName()

const COLUMN_LAYOUT = useSetting("COLUMN_LAYOUT")
</script>
