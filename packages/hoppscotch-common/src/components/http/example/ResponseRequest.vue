<template>
  <div
    class="sticky top-0 z-20 flex-none flex-shrink-0 bg-primary p-4 sm:flex sm:flex-shrink-0 sm:space-x-2"
  >
    <div
      class="min-w-[12rem] flex flex-1 whitespace-nowrap rounded border border-divider"
    >
      <div class="relative flex">
        <label for="method">
          <tippy
            interactive
            trigger="click"
            theme="popover"
            :on-shown="() => methodTippyActions.focus()"
          >
            <HoppSmartSelectWrapper>
              <input
                id="method"
                class="flex w-26 cursor-pointer rounded-l bg-primaryLight px-4 py-2 font-semibold text-secondaryDark transition"
                :value="tab.document.response.originalRequest.method"
                :readonly="!isCustomMethod"
                :placeholder="`${t('request.method')}`"
                @input="onSelectMethod($event)"
              />
            </HoppSmartSelectWrapper>
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
                  :style="{
                    color: getMethodLabelColor(method),
                  }"
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
          v-model="tab.document.response.originalRequest.endpoint"
          :placeholder="`${t('request.url_placeholder')}`"
          :auto-complete-env="true"
          :inspection-results="tabResults"
        />
      </div>
    </div>
    <div class="mt-2 flex sm:mt-0 items-stretch space-x-2">
      <HoppButtonPrimary
        id="send"
        v-tippy="{ theme: 'tooltip', delay: [500, 20], allowHTML: true }"
        title="Try"
        label="Try"
        class="min-w-[5rem] flex-1"
        @click="tryExampleResponse"
      />
      <HoppButtonSecondary
        v-tippy="{ theme: 'tooltip', delay: [500, 20], allowHTML: true }"
        :title="`${t(
          'request.save'
        )} <kbd>${getSpecialKey()}</kbd><kbd>S</kbd>`"
        label="Save"
        filled
        :icon="IconSave"
        class="flex-1 rounded"
        @click="saveExample()"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "@composables/i18n"
import { useVModel } from "@vueuse/core"
import { computed, ref } from "vue"
import { getPlatformSpecialKey as getSpecialKey } from "~/helpers/platformutils"
import { getDefaultRESTRequest } from "~/helpers/rest/default"
import { useService } from "dioc/vue"
import { InspectionService } from "~/services/inspection"
import { HoppTab } from "~/services/tab"
import { HoppSavedExampleDocument } from "~/helpers/rest/document"
import { RESTTabService } from "~/services/tab/rest"
import { getMethodLabelColor } from "~/helpers/rest/labelColoring"
import IconSave from "~icons/lucide/save"
import { editRESTRequest, restCollections$ } from "~/newstore/collections"
import { useReadonlyStream } from "~/composables/stream"
import { getRequestsByPath } from "~/helpers/collection/request"
import { HoppRESTRequest } from "@hoppscotch/data"
import { useToast } from "@composables/toast"
import { cloneDeep } from "lodash-es"

const t = useI18n()

const methods = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
  "CONNECT",
  "TRACE",
  "CUSTOM",
]

const toast = useToast()

const props = defineProps<{ modelValue: HoppTab<HoppSavedExampleDocument> }>()
const emit = defineEmits(["update:modelValue"])

const tabs = useService(RESTTabService)

const tab = useVModel(props, "modelValue", emit)

const newMethod = computed(() => {
  return tab.value.document.response.originalRequest.method
})

const tryExampleResponse = () => {
  const {
    endpoint,
    method,
    auth,
    body,
    headers,
    name,
    params,
    requestVariables,
  } = tab.value.document.response.originalRequest

  tabs.createNewTab({
    isDirty: false,
    type: "request",
    request: {
      ...getDefaultRESTRequest(),
      endpoint,
      method,
      auth,
      body,
      headers,
      name,
      params,
      requestVariables,
    },
  })
}

const myCollections = useReadonlyStream(restCollections$, [], "deep")

const saveExample = () => {
  const saveCtx = tab.value.document.saveContext

  if (!saveCtx) {
    return
  }
  if (saveCtx.originLocation === "user-collection") {
    const response = cloneDeep(tab.value.document.response)

    const request = cloneDeep(
      getRequestsByPath(myCollections.value, saveCtx.folderPath)[
        saveCtx.requestIndex
      ] as HoppRESTRequest
    )

    if (!request) return

    console.log("//req", request)

    // Convert object to entries array (preserving order)
    //const entries = Object.entries(request.responses)

    const responseName = response.name

    console.log("response-name", responseName)

    request.responses[responseName] = response

    // const updatedEntries = entries.map(([key, value]) =>
    //   key === responseName ? [responseName, response] : [key, value]
    // )

    console.log("saveExample -> response", response)

    // Convert the array back into an object
    //request.responses = Object.fromEntries(updatedEntries)

    console.log("saveExample -> updatedEntries", request.responses)

    try {
      editRESTRequest(saveCtx.folderPath, saveCtx.requestIndex, request)
    } catch (e) {
      console.error(e)
    }

    toast.success(`${t("request.saved")}`)
  }
}

// Template refs
const methodTippyActions = ref<any | null>(null)

const inspectionService = useService(InspectionService)

const updateMethod = (method: string) => {
  tab.value.document.response.originalRequest.method = method
}

const onSelectMethod = (e: Event | any) => {
  // type any because of value property not being recognized by TS in the event.target object. It is a valid property though.
  updateMethod(e.target.value)
}

const isCustomMethod = computed(() => {
  return (
    tab.value.document.response.originalRequest.method === "CUSTOM" ||
    !methods.includes(newMethod.value)
  )
})

const tabResults = inspectionService.getResultViewFor(tabs.currentTabID.value)
</script>
