<template>
  <div class="flex flex-col flex-1 relative">
    <HttpResponseMeta :response="document.response" />
    <LensesResponseBodyRenderer
      v-if="!loading && hasResponse"
      v-model:selected-tab-preference="selectedTabPreference"
      v-model:document="document"
    />
  </div>
</template>

<script setup lang="ts">
import { useVModel } from "@vueuse/core"
import { computed, ref } from "vue"
import { HoppRESTDocument } from "~/helpers/rest/document"

const props = defineProps<{
  document: HoppRESTDocument
}>()

const emit = defineEmits<{
  (e: "update:tab", val: HoppRESTDocument): void
}>()

const document = useVModel(props, "document", emit)

const selectedTabPreference = ref<string | null>(null)

const hasResponse = computed(
  () =>
    document.value.response?.type === "success" ||
    document.value.response?.type === "fail"
)

const loading = computed(() => document.value.response?.type === "loading")
</script>
