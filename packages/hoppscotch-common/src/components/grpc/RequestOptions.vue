<script setup lang="ts">
import type { HoppGRPCRequest } from "@hoppscotch/data"
import { useVModel } from "@vueuse/core"
import type { GRPCOptionTab } from "~/helpers/grpc/document"

const props = defineProps<{
  modelValue: HoppGRPCRequest
  optionTab: GRPCOptionTab
  schemaError?: string
  parsing?: boolean
}>()
const emit = defineEmits<{
  (event: "update:modelValue", value: HoppGRPCRequest): void
  (event: "update:optionTab", value: GRPCOptionTab): void
}>()
const request = useVModel(props, "modelValue", emit)

const addMetadata = () =>
  request.value.metadata.push({ key: "", value: "", active: true })
const removeMetadata = (index: number) =>
  request.value.metadata.splice(index, 1)
</script>

<template>
  <div class="flex h-full flex-col">
    <div class="flex border-b border-divider">
      <button
        v-for="tab in ['body', 'metadata', 'proto'] as const"
        :key="tab"
        class="px-4 py-3 capitalize"
        :class="
          optionTab === tab && 'border-b-2 border-accent text-secondaryDark'
        "
        @click="$emit('update:optionTab', tab)"
      >
        {{ tab
        }}<span v-if="tab === 'proto'"> ({{ request.protoFiles.length }})</span>
      </button>
    </div>
    <GrpcRequestBody v-if="optionTab === 'body'" v-model="request.body" />
    <div v-else-if="optionTab === 'metadata'" class="flex flex-col gap-2 p-4">
      <div
        v-for="(entry, index) in request.metadata"
        :key="index"
        class="flex gap-2"
      >
        <input
          v-model="entry.active"
          type="checkbox"
          :aria-label="`Enable metadata ${index + 1}`"
        />
        <input
          v-model="entry.key"
          class="flex-1 bg-primaryLight px-3 py-2"
          placeholder="Metadata key"
        />
        <input
          v-model="entry.value"
          class="flex-1 bg-primaryLight px-3 py-2"
          placeholder="Value"
        />
        <HoppButtonSecondary label="Remove" @click="removeMetadata(index)" />
      </div>
      <HoppButtonSecondary
        class="w-fit"
        label="Add metadata"
        @click="addMetadata"
      />
    </div>
    <GrpcProtoSource
      v-else
      v-model="request.protoFiles"
      :error="schemaError"
      :loading="parsing"
    />
  </div>
</template>
