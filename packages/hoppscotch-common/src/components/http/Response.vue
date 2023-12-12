<template>
  <div class="flex flex-col flex-1 relative">
    <HttpResponseMeta :response="doc.response" />
    <LensesResponseBodyRenderer
      v-if="!loading && hasResponse"
      v-model:document="doc"
      v-model:editor-settings="editorSettings"
    />
  </div>
</template>

<script setup lang="ts">
import { useVModel } from "@vueuse/core"
import { computed } from "vue"
import { HoppRESTDocument, RESTEditorSettings } from "~/helpers/rest/document"

const props = defineProps<{
  document: HoppRESTDocument
  editorSettings: RESTEditorSettings
}>()

const emit = defineEmits<{
  (e: "update:tab", val: HoppRESTDocument): void
  (e: "update:editorSettings", val: RESTEditorSettings): void
}>()

const doc = useVModel(props, "document", emit)
const editorSettings = useVModel(props, "editorSettings", emit)

const hasResponse = computed(
  () =>
    doc.value.response?.type === "success" ||
    doc.value.response?.type === "fail"
)

const loading = computed(() => doc.value.response?.type === "loading")
</script>
