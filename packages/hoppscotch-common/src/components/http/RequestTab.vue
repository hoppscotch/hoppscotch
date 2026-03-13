<template>
  <AppPaneLayout layout-id="rest-primary">
    <template #primary>
      <HttpRequest v-model="tab" />
      <HttpRequestOptions
        v-model="tab.document.request"
        v-model:option-tab="tab.document.optionTabPreference!"
        v-model:inherited-properties="tab.document.inheritedProperties"
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
import { watch } from "vue"
import { useVModel } from "@vueuse/core"
import { cloneDeep, isEqual } from "lodash-es"
import { HoppTab } from "~/services/tab"
import { HoppRequestDocument } from "~/helpers/rest/document"

// TODO: Move Response and Request execution code to over here

const props = defineProps<{ modelValue: HoppTab<HoppRequestDocument> }>()

const emit = defineEmits<{
  (e: "update:modelValue", val: HoppTab<HoppRequestDocument>): void
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
        tab.value.document.isDirty = true
        return
      }

      tab.value.document.isDirty = !isEqual(
        updatedValue,
        requestHandleRef.value.data.request
      )

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
