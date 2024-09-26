<template>
  <HttpExampleResponseMeta :response="doc.response" :is-embed="isEmbed" />
  <HttpExampleLenseBodyRenderer v-model:document="doc" />
</template>

<script setup lang="ts">
import { useVModel } from "@vueuse/core"
import {
  HoppRequestDocument,
  HoppSavedExampleDocument,
} from "~/helpers/rest/document"

const props = defineProps<{
  document: HoppSavedExampleDocument
  isEmbed: boolean
}>()

const emit = defineEmits<{
  (e: "update:tab", val: HoppRequestDocument): void
}>()

const doc = useVModel(props, "document", emit)
</script>
