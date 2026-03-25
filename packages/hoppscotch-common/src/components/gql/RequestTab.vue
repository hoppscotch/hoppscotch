<template>
  <AppPaneLayout layout-id="gql-in-rest-primary">
    <template #primary>
      <GqlRequest v-model="tab" />
      <GqlRequestOptions
        v-model="tab.document.request"
        v-model:response="tab.document.response"
        v-model:option-tab="tab.document.optionTabPreference"
        :inherited-properties="tab.document.inheritedProperties"
        :tab-id="tab.id"
        :url="tab.document.request.url"
        @cursor-position="(pos) => (tab.document.cursorPosition = pos)"
      />
    </template>
    <template #secondary>
      <GraphqlResponse :response="tab.document.response" :tab-id="tab.id" />
    </template>
  </AppPaneLayout>
</template>

<script setup lang="ts">
import { useVModel } from "@vueuse/core"
import { cloneDeep } from "lodash-es"
import { watch } from "vue"
import { isEqualHoppGQLRequest } from "~/helpers/graphql"
import { HoppGQLRequestDocument } from "~/helpers/rest/document"
import { HoppTab } from "~/services/tab"

const props = defineProps<{ modelValue: HoppTab<HoppGQLRequestDocument> }>()

const emit = defineEmits<{
  (e: "update:modelValue", val: HoppTab<HoppGQLRequestDocument>): void
}>()

const tab = useVModel(props, "modelValue", emit)

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
