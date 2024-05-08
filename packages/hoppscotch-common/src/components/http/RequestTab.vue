<template>
  <AppPaneLayout layout-id="rest-primary">
    <template #primary>
      <HttpRequest v-model="tab" />
      <HttpRequestOptions
        v-model="tab.document.request"
        v-model:option-tab="tab.document.optionTabPreference"
        v-model:inherited-properties="tab.document.inheritedProperties"
      />
    </template>
    <template #secondary>
      <HttpResponse v-model:document="tab.document" :is-embed="false" />
    </template>
  </AppPaneLayout>
</template>

<script setup lang="ts">
import { watch } from "vue"
import { useVModel } from "@vueuse/core"
import { cloneDeep, isEqual } from "lodash-es"
import { HoppTab } from "~/services/tab"
import { HoppRESTDocument } from "~/helpers/rest/document"

// TODO: Move Response and Request execution code to over here

const props = defineProps<{ modelValue: HoppTab<HoppRESTDocument> }>()

const emit = defineEmits<{
  (e: "update:modelValue", val: HoppTab<HoppRESTDocument>): void
}>()

const tab = useVModel(props, "modelValue", emit)

let oldRequest = cloneDeep(tab.value.document.request)

watch(
  () => tab.value.document.request,
  (updatedValue) => {
    // Request from the collection tree
    if (
      tab.value.document.saveContext?.originLocation ===
      "workspace-user-collection"
    ) {
      const requestHandleRef =
        tab.value.document.saveContext.requestHandle?.get()

      if (!requestHandleRef || requestHandleRef.value.type === "invalid") {
        return
      }

      if (
        !tab.value.document.isDirty &&
        !isEqual(oldRequest, requestHandleRef?.value.data.request)
      ) {
        tab.value.document.isDirty = true
      }

      if (
        tab.value.document.isDirty &&
        isEqual(oldRequest, requestHandleRef?.value.data.request)
      ) {
        tab.value.document.isDirty = false
      }

      return
    }

    // Unsaved request
    if (!tab.value.document.isDirty && !isEqual(oldRequest, updatedValue)) {
      tab.value.document.isDirty = true
    }

    oldRequest = cloneDeep(updatedValue)
  },
  { deep: true }
)
</script>
