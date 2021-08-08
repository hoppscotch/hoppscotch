<template>
  <div class="bg-primary flex p-4 top-0 z-10 sticky">
    <div class="relative inline-flex">
      <span class="select-wrapper">
        <tippy
          ref="methodOptions"
          interactive
          trigger="click"
          theme="popover"
          arrow
        >
          <template #trigger>
            <input
              id="method"
              class="
                bg-primaryLight
                border border-divider
                rounded-l
                cursor-pointer
                flex
                font-semibold font-mono
                text-secondaryDark
                py-2
                px-4
                transition
                w-28
                truncate
                focus:border-accent focus:outline-none
              "
              :value="newMethod"
              :readonly="isCustomMethod()"
              @input="onSelectMethod($event.target.value)"
            />
          </template>
          <SmartItem
            v-for="(method, index) in methods"
            :key="`method-${index}`"
            :label="method"
            class="font-mono"
            @click.native="onSelectMethod(method)"
          />
        </tippy>
      </span>
    </div>
    <div class="flex-1 inline-flex">
      <SmartEnvInput
        v-if="EXPERIMENTAL_URL_BAR_ENABLED"
        v-model="newEndpoint"
        :placeholder="$t('url')"
        styles="
          bg-primaryLight
          border border-divider
          flex
          font-semibold font-mono
          flex-1
          text-secondaryDark
          py-1
          px-4
          transition
          truncate
          focus:outline-none focus:border-accent
        "
        @enter="newSendRequest()"
      />
      <input
        v-else
        id="url"
        v-model="newEndpoint"
        class="
          bg-primaryLight
          border border-divider
          flex
          font-semibold font-mono
          flex-1
          text-secondaryDark
          py-2
          px-4
          transition
          truncate
          focus:border-accent focus:outline-none
        "
        name="url"
        type="text"
        spellcheck="false"
        :placeholder="$t('url')"
        autofocus
        @keyup.enter="newSendRequest()"
      />
    </div>
    <div class="flex">
      <ButtonPrimary
        id="send"
        class="rounded-none min-w-20"
        :label="!loading ? $t('send') : $t('cancel')"
        @click.native="!loading ? newSendRequest() : cancelRequest()"
      />
      <span class="inline-flex">
        <tippy
          ref="sendOptions"
          interactive
          trigger="click"
          theme="popover"
          arrow
        >
          <template #trigger>
            <ButtonPrimary
              class="rounded-l-none"
              outline
              icon="keyboard_arrow_down"
            />
          </template>
          <SmartItem
            :label="$t('import.curl')"
            icon="import_export"
            @click.native="
              showCurlImportModal = !showCurlImportModal
              sendOptions.tippy().hide()
            "
          />
          <SmartItem
            :label="$t('show.code')"
            icon="code"
            @click.native="
              showCodegenModal = !showCodegenModal
              sendOptions.tippy().hide()
            "
          />
          <SmartItem
            ref="clearAll"
            :label="$t('clear_all')"
            icon="clear_all"
            @click.native="
              clearContent()
              sendOptions.tippy().hide()
            "
          />
        </tippy>
      </span>
      <ButtonSecondary
        class="rounded-r-none ml-2"
        :label="$t('request.save')"
        :shortcut="[getSpecialKey(), 'S']"
        outline
        @click.native="showSaveRequestModal = true"
      />
      <span class="inline-flex">
        <tippy
          ref="saveOptions"
          interactive
          trigger="click"
          theme="popover"
          arrow
        >
          <template #trigger>
            <ButtonSecondary
              icon="keyboard_arrow_down"
              outline
              class="rounded-l-none"
            />
          </template>
          <input
            id="request-name"
            v-model="requestName"
            :placeholder="$t('request.name')"
            name="request-name"
            type="text"
            class="mb-2 input"
          />
          <SmartItem
            ref="copyRequest"
            :label="$t('request.copy_link')"
            :icon="hasNavigatorShare ? 'share' : 'content_copy'"
            @click.native="
              copyRequest()
              saveOptions.tippy().hide()
            "
          />
          <SmartItem
            ref="saveRequest"
            :label="$t('request.save_as')"
            icon="create_new_folder"
            @click.native="
              showSaveRequestModal = true
              saveOptions.tippy().hide()
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

<script lang="ts">
import {
  defineComponent,
  ref,
  useContext,
  watch,
} from "@nuxtjs/composition-api"
import {
  updateRESTResponse,
  restEndpoint$,
  setRESTEndpoint,
  restMethod$,
  updateRESTMethod,
  resetRESTRequest,
  useRESTRequestName,
} from "~/newstore/RESTSession"
import { getPlatformSpecialKey } from "~/helpers/platformutils"
import { runRESTRequest$ } from "~/helpers/RequestRunner"
import {
  useStreamSubscriber,
  useStream,
  useNuxt,
} from "~/helpers/utils/composables"
import { defineActionHandler } from "~/helpers/actions"
import { copyToClipboard } from "~/helpers/utils/clipboard"
import { useSetting } from "~/newstore/settings"

const methods = [
  "GET",
  "HEAD",
  "POST",
  "PUT",
  "DELETE",
  "CONNECT",
  "OPTIONS",
  "TRACE",
  "PATCH",
  "CUSTOM",
]

export default defineComponent({
  setup() {
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

    const newSendRequest = () => {
      loading.value = true

      subscribeToStream(
        runRESTRequest$(),
        (responseState) => {
          console.log(responseState)
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

    const copyRequest = () => {
      if (navigator.share) {
        const time = new Date().toLocaleTimeString()
        const date = new Date().toLocaleDateString()
        navigator
          .share({
            title: "Hoppscotch",
            text: `Hoppscotch • Open source API development ecosystem at ${time} on ${date}`,
            url: window.location.href,
          })
          .then(() => {})
          .catch(() => {})
      } else {
        copyToClipboard(window.location.href)
        $toast.info(t("copied_to_clipboard").toString(), {
          icon: "done",
        })
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

    defineActionHandler("request.send-cancel", () => {
      if (!loading.value) newSendRequest()
      else cancelRequest()
    })
    defineActionHandler("request.reset", clearContent)
    defineActionHandler("request.copy-link", copyRequest)
    defineActionHandler("request.method.next", cycleDownMethod)
    defineActionHandler("request.method.prev", cycleUpMethod)
    defineActionHandler(
      "request.save",
      () => (showSaveRequestModal.value = true)
    )
    defineActionHandler("request.method.get", () => updateMethod("GET"))
    defineActionHandler("request.method.post", () => updateMethod("POST"))
    defineActionHandler("request.method.put", () => updateMethod("PUT"))
    defineActionHandler("request.method.delete", () => updateMethod("DELETE"))
    defineActionHandler("request.method.head", () => updateMethod("HEAD"))

    const isCustomMethod = () => {
      if (newMethod.value === "CUSTOM" || !methods.includes(newMethod.value))
        return false
      return true
    }

    return {
      newEndpoint,
      newMethod,
      methods,
      loading,
      newSendRequest,
      requestName: useRESTRequestName(),
      getSpecialKey: getPlatformSpecialKey,
      showCurlImportModal,
      showCodegenModal,
      showSaveRequestModal,
      hasNavigatorShare,
      updateMethod,
      clearContent,
      copyRequest,
      onSelectMethod,

      EXPERIMENTAL_URL_BAR_ENABLED: useSetting("EXPERIMENTAL_URL_BAR_ENABLED"),

      // Template refs
      methodOptions,
      sendOptions,
      saveOptions,

      isCustomMethod,
    }
  },
})
</script>
