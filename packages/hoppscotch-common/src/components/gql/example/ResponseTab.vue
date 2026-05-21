<template>
  <AppPaneLayout layout-id="gql-example-primary">
    <template #primary>
      <GqlExampleResponseRequest v-model="tab" />
      <GqlRequestOptions
        v-model="tab.document.response.originalRequest"
        v-model:option-tab="optionTab"
        :inherited-properties="tab.document.inheritedProperties"
        :show-run-actions="false"
      />
    </template>
    <template #secondary>
      <GqlExampleResponse v-model:document="tab.document" />
    </template>
  </AppPaneLayout>
</template>

<script setup lang="ts">
import { useVModel } from "@vueuse/core"
import { cloneDeep, isEqual } from "lodash-es"
import { ref, watch } from "vue"
import { HoppTab } from "~/services/tab"
import { HoppSavedGQLExampleDocument } from "~/helpers/rest/document"
import type { GQLOptionTabs } from "~/components/graphql/RequestOptions.vue"

const props = defineProps<{
  modelValue: HoppTab<HoppSavedGQLExampleDocument>
}>()

const emit = defineEmits<{
  (e: "update:modelValue", val: HoppTab<HoppSavedGQLExampleDocument>): void
}>()

const tab = useVModel(props, "modelValue", emit)
const optionTab = ref<GQLOptionTabs>("query")

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
