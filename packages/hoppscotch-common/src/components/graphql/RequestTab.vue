<template>
  <AppPaneLayout layout-id="gql-primary">
    <template #primary>
      <GraphqlRequestOptions
        v-model="tab.document.request"
        v-model:response="tab.response"
        :tab-id="tab.id"
      />
    </template>
    <template #secondary>
      <GraphqlResponse :response="tab.response" />
    </template>
  </AppPaneLayout>
</template>

<script setup lang="ts">
import { useVModel } from "@vueuse/core"
import { cloneDeep } from "lodash-es"
import { watch } from "vue"
import { isEqualHoppGQLRequest } from "~/helpers/graphql"
import { HoppGQLTab } from "~/helpers/graphql/tab"

// TODO: Move Response and Request execution code to over here

const props = defineProps<{ modelValue: HoppGQLTab }>()

const emit = defineEmits<{
  (e: "update:modelValue", val: HoppGQLTab): void
}>()

const tab = useVModel(props, "modelValue", emit)

// TODO: Come up with a better dirty check
let oldRequest = cloneDeep(tab.value.document.request)
watch(
  () => tab.value.document.request,
  (updatedValue) => {
    // TODO: Check equality of request
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
