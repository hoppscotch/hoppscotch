<template>
  <div
    class="
      bg-primary
      flex
      space-x-2
      p-4
      top-0
      z-10
      sticky
      overflow-x-auto
      hide-scrollbar
    "
  >
    <div class="flex flex-1">
      <div class="flex relative">
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
                  class="
                    bg-primaryLight
                    border border-divider
                    rounded-l
                    cursor-pointer
                    flex
                    font-semibold
                    text-secondaryDark
                    py-2
                    px-4
                    w-26
                    hover:border-dividerDark
                    focus-visible:bg-transparent
                    focus-visible:border-dividerDark
                  "
                  :value="newMethod"
                  :readonly="!isCustomMethod"
                  :placeholder="`${$t('request.method')}`"
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
          :placeholder="`${$t('request.url')}`"
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
        />
      </div>
    </div>
    <div class="flex">
      <ButtonPrimary
        id="send"
        class="rounded-r-none flex-1 min-w-20"
        :label="`${!loading ? $t('action.send') : $t('action.cancel')}`"
        @click.native="!loading ? newSendRequest() : cancelRequest()"
      />
      <span class="flex">
        <tippy
          ref="sendOptions"
          interactive
          trigger="click"
          theme="popover"
          arrow
        >
          <template #trigger>
            <ButtonPrimary class="rounded-l-none" filled svg="chevron-down" />
          </template>
          <SmartItem
            :label="`${$t('import.curl')}`"
            svg="file-code"
            @click.native="
              () => {
                showCurlImportModal = !showCurlImportModal
                sendOptions.tippy().hide()
              }
            "
          />
          <SmartItem
            :label="`${$t('show.code')}`"
            svg="code-2"
            @click.native="
              () => {
                showCodegenModal = !showCodegenModal
                sendOptions.tippy().hide()
              }
            "
          />
          <SmartItem
            ref="clearAll"
            :label="`${$t('action.clear_all')}`"
            svg="rotate-ccw"
            @click.native="
              () => {
                clearContent()
                sendOptions.tippy().hide()
              }
            "
          />
        </tippy>
      </span>
      <ButtonSecondary
        class="rounded rounded-r-none ml-2"
        :label="
          windowInnerWidth.x.value >= 768 && COLUMN_LAYOUT
            ? `${$t('request.save')}`
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
            :placeholder="`${$t('request.name')}`"
            name="request-name"
            type="text"
            autocomplete="off"
            class="mb-2 input"
            @keyup.enter="saveOptions.tippy().hide()"
          />
          <SmartItem
            ref="copyRequest"
            :label="shareLinkStatus"
            :svg="copyLinkIcon"
            :loading="fetchingShareLink"
            @click.native="
              () => {
                copyRequest()
              }
            "
          />
          <SmartItem
            ref="saveRequest"
            :label="`${$t('request.save_as')}`"
            svg="folder-plus"
            @click.native="
              () => {
                showSaveRequestModal = true
                saveOptions.tippy().hide()
              }
            "
          />
        </tippy>
      </span>
    </div>
    <HttpImportCurl
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
import { computed, ref, useContext, watch } from "@nuxtjs/composition-api"
import { isRight } from "fp-ts/lib/Either"
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
} from "~/newstore/RESTSession"
import { editRESTRequest } from "~/newstore/collections"
import { runRESTRequest$ } from "~/helpers/RequestRunner"
import {
  useStreamSubscriber,
  useStream,
  useNuxt,
} from "~/helpers/utils/composables"
import { defineActionHandler } from "~/helpers/actions"
import { copyToClipboard } from "~/helpers/utils/clipboard"
import { useSetting } from "~/newstore/settings"
import { overwriteRequestTeams } from "~/helpers/teams/utils"
import { apolloClient } from "~/helpers/apollo"
import useWindowSize from "~/helpers/utils/useWindowSize"
import { createShortcode } from "~/helpers/backend/mutations/Shortcode"

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

const {
  $toast,
  app: { i18n },
} = useContext()
const nuxt = useNuxt()
const t = i18n.t.bind(i18n)
const { subscribeToStream } = useStreamSubscriber()

const newEndpoint = useStream(restEndpoint$, "", setRESTEndpoint)
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

// Update Nuxt Loading bar
watch(loading, () => {
  if (loading.value) {
    nuxt.value.$loading.start()
  } else {
    nuxt.value.$loading.finish()
  }
})

const newSendRequest = async () => {
  loading.value = true

  // Double calling is because the function returns a TaskEither than should be executed
  const streamResult = await runRESTRequest$()()

  // TODO: What if stream fetching failed (script execution errors ?) (isLeft)
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
  }
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
const shareLink = ref("")
const shareLinkStatus = ref(t("request.copy_link"))
const fetchingShareLink = ref(false)

const copyRequest = async () => {
  shareLink.value = ""
  fetchingShareLink.value = true
  shareLinkStatus.value = t("state.loading")
  const request = getRESTRequest()
  const shortcodeResult = await createShortcode(request)()
  if (E.isLeft(shortcodeResult)) {
    $toast.error(`${shortcodeResult.left.error}`)
    shareLink.value = `${t("error.something_went_wrong")}`
  } else if (E.isRight(shortcodeResult)) {
    shareLink.value = shortcodeResult.right.createShortcode.id
    if (navigator.share) {
      const time = new Date().toLocaleTimeString()
      const date = new Date().toLocaleDateString()
      navigator
        .share({
          title: "Hoppscotch",
          text: `Hoppscotch • Open source API development ecosystem at ${time} on ${date}`,
          url: `https://hopp.sh/r/${shareLink.value}`,
        })
        .then(() => {})
        .catch(() => {})
    } else {
      copyLinkIcon.value = "check"
      copyToClipboard(`https://hopp.sh/r/${shareLink.value}`)
      $toast.success(`${t("state.copied_to_clipboard")}`, {
        icon: "content_paste",
      })
      setTimeout(() => (copyLinkIcon.value = "copy"), 2000)
    }
  }
  fetchingShareLink.value = false
  shareLinkStatus.value = `/${shareLink.value}`
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
    editRESTRequest(saveCtx.folderPath, saveCtx.requestIndex, getRESTRequest())
    $toast.success(`${t("request.saved")}`, {
      icon: "playlist_add_check",
    })
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
          $toast.success(`${t("request.saved")}`, {
            icon: "playlist_add_check",
          })
        })
        .catch(() => {
          $toast.error(t("profile.no_permission").toString(), {
            icon: "error_outline",
          })
        })
    } catch (error) {
      showSaveRequestModal.value = true
      $toast.error(t("error.something_went_wrong").toString(), {
        icon: "error_outline",
      })
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
