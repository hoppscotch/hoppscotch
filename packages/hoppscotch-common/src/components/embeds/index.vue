<template>
  <div class="flex flex-1 flex-col">
    <header
      class="flex flex-1 flex-shrink-0 items-center justify-between space-x-2 overflow-x-auto overflow-y-hidden px-2 py-2"
    >
      <div class="flex flex-1 items-center justify-between space-x-2">
        <HoppButtonSecondary
          class="!font-bold uppercase tracking-wide !text-secondaryDark hover:bg-primaryDark focus-visible:bg-primaryDark"
          :label="t('app.name')"
          to="/"
        />
        <div class="flex">
          <HoppSmartItem :label="t('app.open_in_hoppscotch')" />
        </div>
      </div>
    </header>

    <div class="flex-1">
      <div
        class="top-0 z-20 flex-none flex-shrink-0 bg-primary p-4 sm:flex sm:flex-shrink-0 sm:space-x-2"
      >
        <div
          class="min-w-52 flex flex-1 whitespace-nowrap rounded border border-divider"
        >
          <div class="relative flex">
            <label for="method">
              <tippy
                interactive
                trigger="click"
                theme="popover"
                :on-shown="() => methodTippyActions?.focus()"
              >
                <span class="select-wrapper">
                  <input
                    id="method"
                    class="flex w-26 cursor-pointer rounded-l bg-primaryLight px-4 py-2 font-semibold text-secondaryDark transition"
                    :value="tab.document.request.method"
                    :readonly="!isCustomMethod"
                    :placeholder="`${t('request.method')}`"
                    @input="onSelectMethod($event)"
                  />
                </span>
                <template #content="{ hide }">
                  <div
                    ref="methodTippyActions"
                    class="flex flex-col focus:outline-none"
                    tabindex="0"
                    @keyup.escape="hide()"
                  >
                    <HoppSmartItem
                      v-for="(method, index) in methods"
                      :key="`method-${index}`"
                      :label="method"
                      @click="
                        () => {
                          updateMethod(method)
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
            class="flex flex-1 whitespace-nowrap rounded-r border-l border-divider bg-primaryLight transition"
          >
            <SmartEnvInput
              v-model="tab.document.request.endpoint"
              :placeholder="`${t('request.url')}`"
              @enter="newSendRequest"
            />
          </div>
        </div>
        <div class="mt-2 flex sm:mt-0">
          <HoppButtonPrimary
            id="send"
            v-tippy="{ theme: 'tooltip', delay: [500, 20], allowHTML: true }"
            :title="`${t(
              'action.send'
            )} <kbd>${getSpecialKey()}</kbd><kbd>↩</kbd>`"
            :label="`${!loading ? t('action.send') : t('action.cancel')}`"
            class="min-w-20 flex-1"
            @click="!loading ? newSendRequest() : cancelRequest()"
          />
        </div>
      </div>
    </div>

    <div>
      <HttpRequestOptions
        v-model="tab.document.request"
        v-model:option-tab="selectedOptionTab"
      />
    </div>

    <div>
      {{ tab.document.response }}
      <HttpResponse :document="tab.document" />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { Ref } from "vue"
import { computed, useModel } from "vue"
import { ref } from "vue"
import { TippyComponent } from "vue-tippy"
import { useI18n } from "~/composables/i18n"
import { useToast } from "~/composables/toast"
import { getPlatformSpecialKey as getSpecialKey } from "~/helpers/platformutils"
import * as E from "fp-ts/Either"
import { useStreamSubscriber } from "~/composables/stream"
import { HoppRESTResponse } from "~/helpers/types/HoppRESTResponse"
import { runRESTRequest$ } from "~/helpers/RequestRunner"
import { HoppTab } from "~/services/tab"
import { HoppRESTDocument } from "~/helpers/rest/document"

const t = useI18n()
const toast = useToast()

const props = defineProps<{
  modelTab: HoppTab<HoppRESTDocument>
}>()

const tab = useModel(props, "modelTab")

const selectedOptionTab = ref("params")

console.log("request", tab.value.document.request)

const requestCancelFunc: Ref<(() => void) | null> = ref(null)

const loading = ref(false)

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

const { subscribeToStream } = useStreamSubscriber()

const updateMethod = (method: string) => {
  tab.value.document.request.method = method
}

const onSelectMethod = (e: Event | any) => {
  // type any because of value property not being recognized by TS in the event.target object. It is a valid property though.
  updateMethod(e.target.value)
}

const newSendRequest = async () => {
  if (newEndpoint.value === "" || /^\s+$/.test(newEndpoint.value)) {
    toast.error(`${t("empty.endpoint")}`)
    return
  }

  ensureMethodInEndpoint()

  loading.value = true

  const [cancel, streamPromise] = runRESTRequest$(tab)
  const streamResult = await streamPromise

  requestCancelFunc.value = cancel
  if (E.isRight(streamResult)) {
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
        // TODO: Change this any to a proper type
        const result = (streamResult.right as any).value
        if (
          result.type === "network_fail" &&
          result.error?.error === "NO_PW_EXT_HOOK"
        ) {
          const errorResponse: HoppRESTResponse = {
            type: "extension_error",
            error: result.error.humanMessage.heading,
            component: result.error.component,
            req: result.req,
          }
          updateRESTResponse(errorResponse)
        }
        loading.value = false
      }
    )
  } else {
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

const updateRESTResponse = (response: HoppRESTResponse | null) => {
  tab.value.document.response = response
}

const newEndpoint = computed(() => {
  return tab.value.document.request.endpoint
})

const ensureMethodInEndpoint = () => {
  if (
    !/^http[s]?:\/\//.test(newEndpoint.value) &&
    !newEndpoint.value.startsWith("<<")
  ) {
    const domain = newEndpoint.value.split(/[/:#?]+/)[0]
    if (domain === "localhost" || /([0-9]+\.)*[0-9]/.test(domain)) {
      tab.value.document.request.endpoint =
        "http://" + tab.value.document.request.endpoint
    } else {
      tab.value.document.request.endpoint =
        "https://" + tab.value.document.request.endpoint
    }
  }
}

const cancelRequest = () => {
  loading.value = false
  requestCancelFunc.value?.()

  updateRESTResponse(null)
}

const isCustomMethod = computed(() => {
  return tab.value.document.request.method === "CUSTOM"
})

// Template refs
const methodTippyActions = ref<TippyComponent | null>(null)
</script>
