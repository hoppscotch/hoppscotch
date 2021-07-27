<template>
  <div class="bg-primary flex p-4 top-0 z-10 sticky">
    <div class="relative inline-flex">
      <span class="select-wrapper">
        <tippy
          ref="options"
          interactive
          tabindex="-1"
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
                h-8
                text-secondaryDark
                py-1
                px-4
                transition
                w-28
                truncate
                focus:outline-none focus:border-accent
              "
              :value="newMethod$"
              autofocus
              readonly
            />
          </template>
          <SmartItem
            v-for="(method, index) in methods"
            :key="`method-${index}`"
            :label="method"
            class="font-mono"
            @click.native="
              updateMethod(method)
              $refs.options.tippy().hide()
            "
          />
        </tippy>
      </span>
    </div>
    <div class="flex-1 inline-flex">
      <input
        id="url"
        v-model="newEndpoint$"
        class="
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
        name="url"
        type="text"
        spellcheck="false"
        :placeholder="$t('url')"
        @keyup.enter="newSendRequest()"
      />
    </div>
    <!-- <SmartUrlField v-else v-model="uri" /> -->
    <div class="flex">
      <ButtonPrimary
        id="send"
        class="rounded-none"
        :label="!loading ? $t('send') : $t('cancel')"
        :shortcut="[getSpecialKey(), 'G']"
        @click.native="!loading ? newSendRequest() : cancelRequest()"
      />
      <span class="inline-flex">
        <tippy
          ref="sendOptions"
          interactive
          tabindex="-1"
          trigger="click"
          theme="popover"
          arrow
        >
          <template #trigger>
            <ButtonPrimary class="rounded-l-none" icon="keyboard_arrow_down" />
          </template>
          <SmartItem
            :label="$t('import_curl')"
            icon="import_export"
            @click.native="
              showCurlImportModal = !showCurlImportModal
              $refs.sendOptions.tippy().hide()
            "
          />
          <SmartItem
            :label="$t('show_code')"
            icon="code"
            @click.native="
              showCodegenModal = !showCodegenModal
              $refs.sendOptions.tippy().hide()
            "
          />
          <SmartItem
            ref="clearAll"
            :label="$t('clear_all')"
            icon="clear_all"
            @click.native="
              clearContent()
              $refs.sendOptions.tippy().hide()
            "
          />
        </tippy>
      </span>
      <ButtonSecondary
        class="rounded-r-none h-8 ml-2"
        :label="$t('save')"
        :shortcut="[getSpecialKey(), 'S']"
        outline
        @click.native="showSaveRequestModal = true"
      />
      <span class="inline-flex">
        <tippy
          ref="saveOptions"
          interactive
          tabindex="-1"
          trigger="click"
          theme="popover"
          arrow
        >
          <template #trigger>
            <ButtonSecondary
              icon="keyboard_arrow_down"
              outline
              class="rounded-l-none h-8"
            />
          </template>
          <input
            id="request-name"
            v-model="requestName"
            :placeholder="$t('request_name')"
            name="request-name"
            type="text"
            class="mb-2 input"
          />
          <SmartItem
            ref="copyRequest"
            :label="$t('copy_request_link')"
            :icon="navigatorShare ? 'share' : 'content_copy'"
            @click.native="
              copyRequest()
              $refs.saveOptions.tippy().hide()
            "
          />
          <SmartItem
            ref="saveRequest"
            :label="$t('save_to_collections')"
            icon="create_new_folder"
            @click.native="
              showSaveRequestModal = true
              $refs.saveOptions.tippy().hide()
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

<script>
import { defineComponent } from "@nuxtjs/composition-api"
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

export default defineComponent({
  setup() {
    return {
      requestName: useRESTRequestName(),
    }
  },
  data() {
    return {
      newMethod$: "",
      methods: [
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
      ],
      name: "",
      newEndpoint$: "",
      showCurlImportModal: false,
      showCodegenModal: false,
      navigatorShare: navigator.share,
      loading: false,
      showSaveRequestModal: false,
    }
  },
  subscriptions() {
    return {
      newMethod$: restMethod$,
      newEndpoint$: restEndpoint$,
    }
  },
  watch: {
    newEndpoint$(newVal) {
      setRESTEndpoint(newVal)
    },
  },
  methods: {
    getSpecialKey: getPlatformSpecialKey,
    updateMethod(method) {
      updateRESTMethod(method)
    },
    newSendRequest() {
      this.loading = true
      this.$subscribeTo(
        runRESTRequest$(),
        (responseState) => {
          console.log(responseState)
          updateRESTResponse(responseState)
        },
        () => {
          this.loading = false
        },
        () => {
          this.loading = false
        }
      )
    },
    copyRequest() {
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
        this.$clipboard(window.location.href)
        this.$toast.info(this.$t("copied_to_clipboard"), {
          icon: "done",
        })
      }
    },
    clearContent() {
      resetRESTRequest()
    },
  },
})
</script>
