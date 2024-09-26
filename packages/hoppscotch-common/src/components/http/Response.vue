<template>
  <div class="relative flex flex-1 flex-col">
    <HttpResponseMeta :response="doc.response" :is-embed="isEmbed" />
    <LensesResponseBodyRenderer
      v-if="!loading && hasResponse"
      v-model:document="doc"
      @save-as-example="saveAsExample"
    />
  </div>
  <HttpSaveResponseName
    v-model="responseName"
    :show="showSaveResponseName"
    @submit="onSaveAsExample"
    @hide-modal="showSaveResponseName = false"
  />
</template>

<script setup lang="ts">
import { useVModel } from "@vueuse/core"
import { computed, nextTick, ref } from "vue"
import { HoppRequestDocument } from "~/helpers/rest/document"
import { useResponseBody } from "@composables/lens-actions"
import { getStatusCodeReasonPhrase } from "~/helpers/utils/statusCodes"
import { invokeAction } from "~/helpers/actions"
import {
  HoppRESTResponseOriginalRequest,
  HoppRESTRequestResponse,
} from "@hoppscotch/data"

const props = defineProps<{
  document: HoppRequestDocument
  isEmbed: boolean
}>()

const emit = defineEmits<{
  (e: "update:tab", val: HoppRequestDocument): void
}>()

const doc = useVModel(props, "document", emit)

const hasResponse = computed(
  () =>
    doc.value.response?.type === "success" ||
    doc.value.response?.type === "fail"
)

const responseName = ref("")
const showSaveResponseName = ref(false)

const loading = computed(() => doc.value.response?.type === "loading")

const saveAsExample = () => {
  showSaveResponseName.value = true
}

const onSaveAsExample = () => {
  const response = doc.value.response

  if (response && response.type === "success") {
    const { responseBodyText } = useResponseBody(response)

    const statusText = getStatusCodeReasonPhrase(
      response.statusCode,
      response.statusText
    )

    const {
      method,
      endpoint,
      headers,
      body,
      auth,
      params,
      name,
      requestVariables,
    } = response.req

    const originalRequest: HoppRESTResponseOriginalRequest = {
      v: "1",
      method,
      endpoint,
      headers,
      body,
      auth,
      params,
      name,
      requestVariables,
    }

    const resName = responseName.value.trim()

    const responseObj: HoppRESTRequestResponse = {
      status: statusText,
      code: response.statusCode,
      headers: response.headers,
      body: responseBodyText.value,
      name: resName,
      originalRequest,
    }

    doc.value.request.responses = {
      ...doc.value.request.responses,
      [resName]: responseObj,
    }

    showSaveResponseName.value = false

    nextTick(() => {
      // Save the request after adding the response
      invokeAction("request.save")
    })
  }
}
</script>
