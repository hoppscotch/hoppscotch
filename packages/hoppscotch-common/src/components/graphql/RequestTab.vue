<template>
  <AppPaneLayout layout-id="gql-primary">
    <template #primary>
      <GraphqlRequestOptions
        :tab-id="tab.id"
        v-model="tab.request"
        v-model:response="tab.response"
      />
    </template>
    <template #secondary>
      <GraphqlResponse :response="tab.response" />
    </template>
  </AppPaneLayout>
</template>

<script setup lang="ts">
import { cloneDeep } from "lodash-es"
import { ref, watch } from "vue"
import { GQLTab } from "~/newstore/GQLSession"

// v-model integration with props and emit
const props = defineProps<{ modelValue: GQLTab }>()
const emit = defineEmits(["update:modelValue"])

const tab = ref(cloneDeep(props.modelValue))

// const onUpdateResponse = (response: any) => {
//   tab.value.response = response
// }

watch(
  () => tab.value,
  (newVal) => {
    console.log("tab changed", newVal)
    emit("update:modelValue", newVal)
  },
  { deep: true }
)
</script>
