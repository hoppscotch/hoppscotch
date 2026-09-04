<script setup lang="ts">
import { useVModel } from "@vueuse/core"
import { computed } from "vue"
import { useGRPCRequest } from "~/composables/useGRPCRequest"
import { useGRPCRequestDirtyState } from "~/composables/useGRPCRequestDirtyState"
import { getDefaultGRPCRequestBody } from "~/helpers/grpc"
import type { HoppGRPCDocument } from "~/helpers/grpc/document"
import type { HoppTab } from "~/services/tab"

const props = defineProps<{ modelValue: HoppTab<HoppGRPCDocument> }>()
const emit = defineEmits<{
  (event: "update:modelValue", value: HoppTab<HoppGRPCDocument>): void
}>()
const tab = useVModel(props, "modelValue", emit)
const document = computed({
  get: () => tab.value.document,
  set: (value) => (tab.value.document = value),
})
const { services, methods, schemaError, isParsing, isLoading, send, cancel } =
  useGRPCRequest(document)
useGRPCRequestDirtyState(document)

const selectService = (service: string) => {
  tab.value.document.request.service = service
  const method = services.value
    .find((item) => item.name === service)
    ?.methods.find((item) => !item.requestStream && !item.responseStream)
  tab.value.document.request.method = method?.methodName ?? ""
  if (method)
    tab.value.document.request.body = getDefaultGRPCRequestBody(
      method.requestType
    )
}

const selectMethod = (methodName: string) => {
  tab.value.document.request.method = methodName
  const method = methods.value.find((item) => item.methodName === methodName)
  if (method)
    tab.value.document.request.body = getDefaultGRPCRequestBody(
      method.requestType
    )
}
</script>

<template>
  <AppPaneLayout layout-id="grpc-primary">
    <template #primary>
      <div class="flex h-full flex-col">
        <GrpcEndpointBar
          :url="tab.document.request.url"
          :service="tab.document.request.service"
          :method="tab.document.request.method"
          :services="services"
          :methods="methods"
          :loading="isLoading"
          @update:url="tab.document.request.url = $event"
          @update:service="selectService"
          @update:method="selectMethod"
          @send="send"
          @cancel="cancel"
        />
        <GrpcRequestOptions
          v-model="tab.document.request"
          :option-tab="tab.document.optionTabPreference ?? 'body'"
          :schema-error="schemaError"
          :parsing="isParsing"
          @update:option-tab="tab.document.optionTabPreference = $event"
        />
      </div>
    </template>
    <template #secondary>
      <GrpcResponse
        :response="tab.document.response"
        :error="tab.document.error"
        :loading="isLoading"
      />
    </template>
  </AppPaneLayout>
</template>
