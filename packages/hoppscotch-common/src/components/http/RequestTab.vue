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
import { watch, computed, provide } from "vue"
import { useVModel } from "@vueuse/core"
import { cloneDeep } from "lodash-es"
import { isEqualHoppRESTRequest } from "@hoppscotch/data"
import { HoppTab } from "~/services/tab"
import { HoppRequestDocument } from "~/helpers/tab/document"
import { useReadonlyStream } from "@composables/stream"
import {
  aggregateEnvsWithCurrentValue$,
  getAggregateEnvsWithCurrentValue,
} from "~/newstore/environments"
import { getEffectiveVariablesForRequest } from "~/helpers/utils/environments"
import { ENV_TOOLTIP_EDITABLE } from "~/helpers/editor/extensions/HoppEnvironment"

const props = defineProps<{ modelValue: HoppTab<HoppRequestDocument> }>()

const emit = defineEmits<{
  (e: "update:modelValue", val: HoppTab<HoppRequestDocument>): void
}>()

const tab = useVModel(props, "modelValue", emit)

// Editors in a request tab can edit a hovered variable's current value from
// its tooltip.
provide(ENV_TOOLTIP_EDITABLE, true)

const envs = useReadonlyStream(
  aggregateEnvsWithCurrentValue$,
  getAggregateEnvsWithCurrentValue()
)

const resolvedEnvs = computed(() => {
  // `showSecretCollectionValues = false` keeps inherited collection secrets
  // masked in this display list (consumed by the headers/auth preview and the
  // request field editors), matching the other display/preview consumers.
  // Execution/resolution callers (codegen, auth request builder) keep the
  // default `true` because they need the resolved value, not a mask.
  return getEffectiveVariablesForRequest(
    tab.value.document.request.requestVariables,
    tab.value.document.inheritedProperties?.variables,
    envs.value,
    false
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
