<template>
  <AppPaneLayout layout-id="rest-primary">
    <template #primary>
      <HttpRequest v-model="tab.request" @update:response="onUpdateResponse" />
      <HttpRequestOptions v-model="tab.request" />
    </template>
    <template #secondary>
      <HttpResponse :response="tab.response" />
    </template>
  </AppPaneLayout>
</template>

<script setup lang="ts">
import { cloneDeep } from "lodash-es"
import { ref, watch } from "vue"
import { RESTTab } from "~/newstore/RESTSession"

const props = defineProps<{ modelValue: RESTTab }>()
const emit = defineEmits(["update:modelValue"])

const tab = ref(cloneDeep(props.modelValue))

const onUpdateResponse = (response: any) => {
  tab.value.response = response
}

watch(
  () => tab.value,
  (newVal) => {
    emit("update:modelValue", newVal)
  },
  { deep: true }
)
</script>
