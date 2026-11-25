<template>
  <AppPaneLayout layout-id="gql-in-rest-primary">
    <template #primary>
      <GqlRequest v-model="tab" />
      <GqlRequestOptions
        v-model="tab.document.request"
        v-model:response="tab.document.response"
        v-model:test-results="tab.document.testResults"
        v-model:option-tab="tab.document.optionTabPreference"
        :inherited-properties="tab.document.inheritedProperties"
        :tab-id="tab.id"
        :url="tab.document.request.url"
        @cursor-position="(pos) => (tab.document.cursorPosition = pos)"
      />
    </template>
    <template #secondary>
      <GqlResponse
        v-model:document="tab.document"
        :response="tab.document.response"
        :tab-id="tab.id"
      />
    </template>
  </AppPaneLayout>
</template>

<script setup lang="ts">
import { useVModel } from "@vueuse/core"
import { cloneDeep } from "lodash-es"
import { watch, provide } from "vue"
import { isEqualHoppGQLRequest } from "~/helpers/graphql"
import { HoppGQLRequestDocument } from "~/helpers/tab/document"
import { HoppTab } from "~/services/tab"
import { ENV_TOOLTIP_EDITABLE } from "~/helpers/editor/extensions/HoppEnvironment"

const props = defineProps<{ modelValue: HoppTab<HoppGQLRequestDocument> }>()

const emit = defineEmits<{
  (e: "update:modelValue", val: HoppTab<HoppGQLRequestDocument>): void
}>()

const tab = useVModel(props, "modelValue", emit)

// Editors in a request tab can edit a hovered variable's current value from
// its tooltip.
provide(ENV_TOOLTIP_EDITABLE, true)

// --- Dirty checking ---
let oldRequest = cloneDeep(tab.value.document.request)
watch(
  () => tab.value.document.request,
  (updatedValue) => {
    if (
      !tab.value.document.isDirty &&
      !isEqualHoppGQLRequest(oldRequest, updatedValue)
    ) {
      tab.value.document.isDirty = true
    }
    oldRequest = cloneDeep(updatedValue)
  },
  { deep: true }
)
</script>
