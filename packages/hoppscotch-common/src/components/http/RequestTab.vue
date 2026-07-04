<template>
  <AppPaneLayout layout-id="rest-primary">
    <template #primary>
      <HttpRequest v-model="tab" />
      <HttpRequestOptions
        v-model="tab.document.request"
        v-model:option-tab="tab.document.optionTabPreference!"
        v-model:inherited-properties="tab.document.inheritedProperties"
        :envs="resolvedEnvs"
      />
    </template>
    <template #secondary>
      <HttpResponse
        v-model:document="tab.document"
        :tab-id="tab.id"
        :is-embed="false"
      />
    </template>
  </AppPaneLayout>
</template>

<script setup lang="ts">
import { watch, computed } from "vue"
import { useVModel } from "@vueuse/core"
import { cloneDeep } from "lodash-es"
import { isEqualHoppRESTRequest } from "@hoppscotch/data"
import { HoppTab } from "~/services/tab"
import { HoppRequestDocument } from "~/helpers/rest/document"
import { useReadonlyStream } from "@composables/stream"
import {
  aggregateEnvsWithCurrentValue$,
  getAggregateEnvsWithCurrentValue,
} from "~/newstore/environments"
import { getEffectiveVariablesForRequest } from "~/helpers/utils/environments"

const props = defineProps<{ modelValue: HoppTab<HoppRequestDocument> }>()

const emit = defineEmits<{
  (e: "update:modelValue", val: HoppTab<HoppRequestDocument>): void
}>()

const tab = useVModel(props, "modelValue", emit)

const envs = useReadonlyStream(
  aggregateEnvsWithCurrentValue$,
  getAggregateEnvsWithCurrentValue()
)

const resolvedEnvs = computed(() => {
  return getEffectiveVariablesForRequest(
    tab.value.document.request.requestVariables,
    tab.value.document.inheritedProperties?.variables,
    envs.value
  )
})

// TODO: Come up with a better dirty check
let oldRequest = cloneDeep(tab.value.document.request)
watch(
  () => tab.value.document.request,
  (updatedValue) => {
    if (
      !tab.value.document.isDirty &&
      !isEqualHoppRESTRequest(oldRequest, updatedValue)
    ) {
      tab.value.document.isDirty = true
    }

    oldRequest = cloneDeep(updatedValue)
  },
  { deep: true }
)
</script>
