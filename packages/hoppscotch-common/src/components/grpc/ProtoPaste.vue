<script setup lang="ts">
import type { GRPCProtoFile } from "@hoppscotch/data"
import { computed, shallowRef } from "vue"
import {
  createPastedGRPCProtoFile,
  normalizeGRPCProtoPath,
} from "~/helpers/grpc/proto-source"

const props = defineProps<{
  existingNames: string[]
}>()

const emit = defineEmits<{
  (event: "save", file: GRPCProtoFile): void
}>()

const filename = shallowRef("service.proto")
const content = shallowRef("")
const error = shallowRef("")

const isUpdate = computed(() => {
  const normalizedName = normalizeGRPCProtoPath(filename.value.trim())
  return props.existingNames.some(
    (name) => normalizeGRPCProtoPath(name) === normalizedName
  )
})

const save = () => {
  error.value = ""

  try {
    emit("save", createPastedGRPCProtoFile(filename.value, content.value))
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : String(cause)
  }
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col gap-3">
    <input
      v-model="filename"
      class="bg-primaryLight px-3 py-2"
      placeholder="service.proto"
      aria-label="Virtual proto filename"
    />
    <textarea
      v-model="content"
      class="min-h-48 flex-1 resize-none bg-primaryLight p-3 font-mono"
      placeholder='syntax = "proto3";'
      spellcheck="false"
      aria-label="Proto definition"
    />
    <p v-if="error" class="text-red-500">{{ error }}</p>
    <HoppButtonPrimary
      class="w-fit"
      :label="isUpdate ? 'Update proto' : 'Add proto'"
      @click="save"
    />
  </div>
</template>
