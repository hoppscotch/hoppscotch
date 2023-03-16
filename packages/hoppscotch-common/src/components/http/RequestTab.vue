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
import { useVModel } from "@vueuse/core"
import { HoppRESTTab } from "~/helpers/rest/tab"

// TODO: Move Response and Request execution code to over here

const props = defineProps<{ modelValue: HoppRESTTab }>()

const emit = defineEmits<{
  (e: "update:modelValue", val: HoppRESTTab): void
}>()

const tab = useVModel(props, "modelValue", emit)
</script>
