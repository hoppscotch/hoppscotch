<template>
  <div class="relative flex flex-1 flex-col">
    <HttpResponseMeta :response="doc.response" :is-embed="isEmbed" />
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
  isEmbed: boolean
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
