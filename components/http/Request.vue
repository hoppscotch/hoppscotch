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
                rounded-l-lg
                cursor-pointer
                flex
                font-mono
                text-secondaryDark
                py-2
                px-4
                transition
                w-32
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
          font-mono
          text-secondaryDark
          w-full
          py-2
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
        :label="!loading ? $t('send') : $('cancel')"
        :shortcuts="[getSpecialKey(), 'G']"
        outline
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
            <ButtonPrimary
              class="rounded-l-none"
              icon="keyboard_arrow_down"
              outline
            />
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
              clearContent('', $event)
              $refs.sendOptions.tippy().hide()
            "
          />
        </tippy>
      </span>
      <ButtonSecondary
        class="rounded-r-none ml-2"
        :label="$t('save')"
        :shortcuts="[getSpecialKey(), 'S']"
        outline
        @click.native="newSendRequest"
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
              class="rounded-l-none"
            />
          </template>
          <SmartItem :description="$t('token_req_name')" />
          <input
            id="request-name"
            v-model="name"
            name="request-name"
            type="text"
            class="text-sm input"
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
              saveRequest()
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
  </div>
</template>

<script>
import {
  updateRESTResponse,
  restRequest$,
  restEndpoint$,
  setRESTEndpoint,
  restMethod$,
  updateRESTMethod,
} from "~/newstore/RESTSession"
import { createRESTNetworkRequestStream } from "~/helpers/network"
import { currentEnvironment$ } from "~/newstore/environments"
import { getEffectiveRESTRequestStream } from "~/helpers/utils/EffectiveURL"
import { getPlatformSpecialKey } from "~/helpers/platformutils"

export default {
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
      effectiveStream$: null,
      loading: false,
    }
  },
  subscriptions() {
    return {
      newMethod$: restMethod$,
      newEndpoint$: restEndpoint$,
      effectiveStream$: getEffectiveRESTRequestStream(
        restRequest$,
        currentEnvironment$
      ),
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
        createRESTNetworkRequestStream(
          this.effectiveStream$,
          currentEnvironment$
        ),
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
  },
}
</script>
