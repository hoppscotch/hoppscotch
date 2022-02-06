<template>
  <div
    class="sticky top-0 z-10 flex p-4 space-x-2 overflow-x-auto bg-primary hide-scrollbar"
  >
    <div class="flex flex-1">
      <div class="relative flex">
        <label for="method">
          <tippy
            ref="methodOptions"
            interactive
            trigger="click"
            theme="popover"
            arrow
          >
            <template #trigger>
              <span class="select-wrapper">
                <input
                  id="method"
                  class="flex px-4 py-2 font-semibold border rounded-l cursor-pointer bg-primaryLight border-divider text-secondaryDark w-26 hover:border-dividerDark focus-visible:bg-transparent focus-visible:border-dividerDark"
                  :value="newMethod"
                  :readonly="!isCustomMethod"
                  :placeholder="`${t('request.method')}`"
                  @input="onSelectMethod($event.target.value)"
                />
              </span>
            </template>
            <SmartItem
              v-for="(method, index) in methods"
              :key="`method-${index}`"
              :label="method"
              @click.native="onSelectMethod(method)"
            />
          </tippy>
        </label>
      </div>
      <div class="flex flex-1">
        <SmartEnvInput
          v-model="newEndpoint"
          :placeholder="`${t('request.url')}`"
          styles="
            bg-primaryLight
            border border-divider
            flex
            flex-1
            rounded-r
            text-secondaryDark
            min-w-32
            py-1
            px-4
            hover:border-dividerDark
            focus-visible:border-dividerDark
            focus-visible:bg-transparent
          "
          @enter="newSendRequest()"
          @paste="onPasteUrl($event)"
        />
      </div>
    </div>
    <div class="flex">
      <ButtonPrimary
        id="send"
        class="flex-1 rounded-r-none min-w-20"
        :label="`${!loading ? t('action.send') : t('action.cancel')}`"
        @click.native="!loading ? newSendRequest() : cancelRequest()"
      />
      <span class="flex">
        <tippy
          ref="sendOptions"
          interactive
          trigger="click"
          theme="popover"
          arrow
          :on-shown="() => sendTippyActions.focus()"
        >
          <template #trigger>
            <ButtonPrimary class="rounded-l-none" filled svg="chevron-down" />
          </template>
          <div
            ref="sendTippyActions"
            class="flex flex-col focus:outline-none"
            tabindex="0"
            @keyup.c="curl.$el.click()"
            @keyup.s="show.$el.click()"
            @keyup.delete="clearAll.$el.click()"
            @keyup.escape="sendOptions.tippy().hide()"
          >
            <SmartItem
              ref="curl"
              :label="`${t('import.curl')}`"
              svg="file-code"
              :shortcut="['C']"
              @click.native="
                () => {
                  showCurlImportModal = !showCurlImportModal
                  sendOptions.tippy().hide()
                }
              "
            />
            <SmartItem
              ref="show"
              :label="`${t('show.code')}`"
              svg="code-2"
              :shortcut="['S']"
              @click.native="
                () => {
                  showCodegenModal = !showCodegenModal
                  sendOptions.tippy().hide()
                }
              "
            />
            <SmartItem
              ref="clearAll"
              :label="`${t('action.clear_all')}`"
              svg="rotate-ccw"
              :shortcut="['⌫']"
              @click.native="
                () => {
                  clearContent()
                  sendOptions.tippy().hide()
                }
              "
            />
          </div>
        </tippy>
      </span>
      <ButtonSecondary
        class="ml-2 rounded rounded-r-none"
        :label="
          windowInnerWidth.x.value >= 768 && COLUMN_LAYOUT
            ? `${t('request.save')}`
            : ''
        "
        filled
        svg="save"
        @click.native="saveRequest()"
      />
      <span class="flex">
        <tippy
          ref="saveOptions"
          interactive
          trigger="click"
          theme="popover"
          arrow
          :on-shown="() => saveTippyActions.focus()"
        >
          <template #trigger>
            <ButtonSecondary
              svg="chevron-down"
              filled
              class="rounded rounded-l-none"
            />
          </template>
          <input
            id="request-name"
            v-model="requestName"
            :placeholder="`${t('request.name')}`"
            name="request-name"
            type="text"
            autocomplete="off"
            class="mb-2 input"
            @keyup.enter="saveOptions.tippy().hide()"
          />
          <div
            ref="saveTippyActions"
            class="flex flex-col focus:outline-none"
            tabindex="0"
            @keyup.c="copyRequestAction.$el.click()"
            @keyup.s="saveRequestAction.$el.click()"
            @keyup.escape="saveOptions.tippy().hide()"
          >
            <SmartItem
              ref="copyRequestAction"
              :label="shareButtonText"
              :svg="copyLinkIcon"
              :loading="fetchingShareLink"
              :shortcut="['C']"
              @click.native="
                () => {
                  copyRequest()
                }
              "
            />
            <SmartItem
              ref="saveRequestAction"
              :label="`${t('request.save_as')}`"
              svg="folder-plus"
              :shortcut="['S']"
              @click.native="
                () => {
                  showSaveRequestModal = true
                  saveOptions.tippy().hide()
                }
              "
            />
          </div>
        </tippy>
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
import { computed, ref, watch } from "@nuxtjs/composition-api"
import { isLeft, isRight } from "fp-ts/lib/Either"
import * as E from "fp-ts/Either"
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
  useStreamSubscriber,
  useStream,
  useNuxt,
  useI18n,
  useToast,
  useReadonlyStream,
} from "~/helpers/utils/composables"
import { defineActionHandler } from "~/helpers/actions"
import { copyToClipboard } from "~/helpers/utils/clipboard"
import { useSetting } from "~/newstore/settings"
import { overwriteRequestTeams } from "~/helpers/teams/utils"
import { apolloClient } from "~/helpers/apollo"
import useWindowSize from "~/helpers/utils/useWindowSize"
import { createShortcode } from "~/helpers/backend/mutations/Shortcode"

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
const nuxt = useNuxt()

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
const methodOptions = ref<any | null>(null)
const saveOptions = ref<any | null>(null)
const sendOptions = ref<any | null>(null)
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
    nuxt.value.$loading.start()
  } else {
    nuxt.value.$loading.finish()
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
  // Vue-tippy has no typescript support yet
  methodOptions.value.tippy().hide()
}

const clearContent = () => {
  resetRESTRequest()
}

const copyLinkIcon = hasNavigatorShare ? ref("share-2") : ref("copy")
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
  if (navigator.share) {
    const time = new Date().toLocaleTimeString()
    const date = new Date().toLocaleDateString()
    navigator
      .share({
        title: "Hoppscotch",
        text: `Hoppscotch • Open source API development ecosystem at ${time} on ${date}`,
        url: `https://hopp.sh/r${shareLink}`,
      })
      .then(() => {})
      .catch(() => {})
  } else {
    copyLinkIcon.value = "check"
    copyToClipboard(`https://hopp.sh/r${shareLink}`)
    toast.success(`${t("state.copied_to_clipboard")}`)
    setTimeout(() => (copyLinkIcon.value = "copy"), 2000)
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
    try {
      editRESTRequest(
        saveCtx.folderPath,
        saveCtx.requestIndex,
        getRESTRequest()
      )
      toast.success(`${t("request.saved")}`)
    } catch (e) {
      setRESTSaveContext(null)
      saveRequest()
    }
  } else if (saveCtx.originLocation === "team-collection") {
    const req = getRESTRequest()

    // TODO: handle error case (NOTE: overwriteRequestTeams is async)
    try {
      overwriteRequestTeams(
        apolloClient,
        JSON.stringify(req),
        req.name,
        saveCtx.requestID
      )
        .then(() => {
          toast.success(`${t("request.saved")}`)
        })
        .catch(() => {
          toast.error(`${t("profile.no_permission")}`)
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

const windowInnerWidth = useWindowSize()
const COLUMN_LAYOUT = useSetting("COLUMN_LAYOUT")
</script>
