<template>
  <div class="sticky top-0 z-10 bg-primary flex p-4">
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
                flex
                rounded-l-lg
                bg-primaryLight
                font-mono
                w-32
                px-4
                py-2
                truncate
                text-secondaryDark
                font-semibold
                border border-divider
                transition
                focus:outline-none focus:border-accent
                cursor-pointer
              "
              :value="newMethod$"
              autofocus
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
          w-full
          font-mono font-semibold
          truncate
          text-secondaryDark
          px-4
          py-2
          border border-divider
          bg-primaryLight
          transition
          focus:outline-none focus:border-accent
        "
        name="url"
        type="text"
        spellcheck="false"
        :placeholder="$t('url')"
        @keyup.enter="newSendRequest()"
      />
      <!-- <SmartUrlField v-else v-model="uri" /> -->
    </div>
    <div class="flex">
      <span
        id="send"
        class="
          px-4
          py-2
          border border-accent
          font-mono
          flex
          items-center
          truncate
          font-semibold
          bg-accent
          text-white
          cursor-pointer
        "
        @click="newSendRequest"
      >
        {{ $t("send") }}
      </span>
      <!-- <span
        v-else
        id="cancel"
        class="
          px-4
          py-2
          border border-accent
          font-mono
          flex
          items-center
          truncate
          font-semibold
          bg-accent
          text-white
          cursor-pointer
        "
        @click="cancelRequest"
      >
        {{ $t("cancel") }}
      </span> -->
      <tippy
        ref="sendOptions"
        interactive
        tabindex="-1"
        trigger="click"
        theme="popover"
        arrow
      >
        <template #trigger>
          <span
            class="
              px-1
              py-2
              border border-accent
              font-mono
              flex
              items-center
              justify-center
              truncate
              font-semibold
              bg-accent
              text-white
              rounded-r-lg
            "
          >
            <i class="material-icons">keyboard_arrow_down</i>
          </span>
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
      <span
        class="
          ml-4
          px-4
          py-2
          border border-divider
          font-mono
          flex
          items-center
          justify-center
          truncate
          font-semibold
          rounded-l-lg
          cursor-pointer
        "
        @click="newSendRequest"
      >
        Save
      </span>
      <tippy
        ref="saveOptions"
        interactive
        tabindex="-1"
        trigger="click"
        theme="popover"
        arrow
      >
        <template #trigger>
          <span
            class="
              px-1
              py-2
              border border-divider
              font-mono
              flex
              items-center
              justify-center
              truncate
              font-semibold
              rounded-r-lg
            "
          >
            <i class="material-icons">keyboard_arrow_down</i>
          </span>
        </template>
        <SmartItem :description="$t('token_req_name')" />
        <input
          id="request-name"
          v-model="name"
          name="request-name"
          type="text"
          class="input text-sm"
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
    </div>
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
  mounted() {},
  methods: {
    updateMethod(method) {
      updateRESTMethod(method)
    },
    newSendRequest() {
      this.$subscribeTo(
        createRESTNetworkRequestStream(
          this.effectiveStream$,
          currentEnvironment$
        ),
        (responseState) => {
          console.log(responseState)
          updateRESTResponse(responseState)
        }
      )
    },
  },
}
</script>
