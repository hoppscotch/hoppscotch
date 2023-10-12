<template>
  <div class="flex flex-col flex-1 relative">
    <HttpResponseMeta :response="doc.response" />
    <LensesResponseBodyRenderer
      v-if="!loading && hasResponse"
      v-model:document="doc"
    />
  </div>
</template>

<script setup lang="ts">
import { useVModel } from "@vueuse/core"
import { computed } from "vue"
import { HoppRESTDocument } from "~/helpers/rest/document"

const props = defineProps<{
  document: HoppRESTDocument
}>()

const emit = defineEmits<{
  (e: "update:tab", val: HoppRESTDocument): void
}>()

const doc = useVModel(props, "document", emit)

const hasResponse = computed(
  () =>
    doc.value.response?.type === "success" ||
    doc.value.response?.type === "fail"
)

const loading = computed(() => doc.value.response?.type === "loading")
</script>
