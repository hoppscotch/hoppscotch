<template>
  <AppPaneLayout layout-id="rest-primary">
    <template #primary>
      <HttpRequest v-model="tab" />
      <HttpRequestOptions v-model="tab.document.request" />
    </template>
    <template #secondary>
      <HttpResponse v-model:tab="tab" />
    </template>
  </AppPaneLayout>
</template>

<script setup lang="ts">
import { watch } from "vue"
import { useVModel } from "@vueuse/core"
import { HoppRESTTab } from "~/helpers/rest/tab"
import { cloneDeep } from "lodash-es"
import { isEqualHoppRESTRequest } from "@hoppscotch/data"

// TODO: Move Response and Request execution code to over here

const props = defineProps<{ modelValue: HoppRESTTab }>()

const emit = defineEmits<{
  (e: "update:modelValue", val: HoppRESTTab): void
}>()

const tab = useVModel(props, "modelValue", emit)

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
