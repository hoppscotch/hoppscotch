<template>
  <AppPaneLayout layout-id="rest-primary">
    <template #primary>
      <HttpExampleResponseRequest v-model="tab" />
      <HttpRequestOptions
        v-model="tab.document.response.originalRequest"
        v-model:option-tab="optionTabPreference"
        v-model:inherited-properties="tab.document.inheritedProperties"
        :envs="resolvedEnvs"
      />
    </template>
    <template #secondary>
      <HttpExampleResponse v-model:document="tab.document" :is-embed="false" />
    </template>
  </AppPaneLayout>
</template>

<script setup lang="ts">
import { watch, ref, computed } from "vue"
import { useVModel } from "@vueuse/core"
import { cloneDeep, isEqual } from "lodash-es"
import { HoppTab } from "~/services/tab"
import { HoppSavedExampleDocument } from "~/helpers/rest/document"
import { RESTOptionTabs } from "../RequestOptions.vue"
import { useReadonlyStream } from "@composables/stream"
import {
  aggregateEnvsWithCurrentValue$,
  getAggregateEnvsWithCurrentValue,
} from "~/newstore/environments"
import { getEffectiveVariablesForRequest } from "~/helpers/utils/environments"

const props = defineProps<{ modelValue: HoppTab<HoppSavedExampleDocument> }>()

const emit = defineEmits<{
  (e: "update:modelValue", val: HoppTab<HoppSavedExampleDocument>): void
}>()

const tab = useVModel(props, "modelValue", emit)

const optionTabPreference = ref<RESTOptionTabs>("params")

const envs = useReadonlyStream(
  aggregateEnvsWithCurrentValue$,
  getAggregateEnvsWithCurrentValue()
)

const resolvedEnvs = computed(() => {
  return getEffectiveVariablesForRequest(
    tab.value.document.response.originalRequest.requestVariables,
    tab.value.document.inheritedProperties?.variables,
    envs.value
  )
})

// TODO: Come up with a better dirty check
let oldResponse = cloneDeep(tab.value.document.response)
watch(
  () => tab.value.document.response,
  (updatedValue) => {
    if (!tab.value.document.isDirty && !isEqual(oldResponse, updatedValue)) {
      tab.value.document.isDirty = true
    }

    oldResponse = cloneDeep(updatedValue)
  },
  { deep: true }
)
</script>
