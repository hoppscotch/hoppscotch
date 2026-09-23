<script setup lang="ts">
import type { GRPCProtoFile } from "@hoppscotch/data"
import { shallowRef } from "vue"
import {
  mergeGRPCProtoFiles,
  readGRPCProtoFiles,
} from "~/helpers/grpc/proto-source"
import IconTrash from "~icons/lucide/trash-2"
import ProtoPaste from "./ProtoPaste.vue"

defineProps<{
  error?: string
  loading?: boolean
}>()

const protoFiles = defineModel<GRPCProtoFile[]>({ required: true })
const activeSource = shallowRef<"files" | "folder" | "paste">("files")
const sourceError = shallowRef("")

const importFiles = async (event: Event, stripRootDirectory = false) => {
  const input = event.target as HTMLInputElement
  sourceError.value = ""

  try {
    const imported = await readGRPCProtoFiles(input.files ?? [], {
      stripRootDirectory,
    })

    if (!imported.length) {
      sourceError.value = stripRootDirectory
        ? "The selected folder does not contain any .proto files"
        : "Select at least one .proto file"
    } else {
      protoFiles.value = mergeGRPCProtoFiles(protoFiles.value, imported)
    }
  } catch (cause) {
    sourceError.value =
      cause instanceof Error ? cause.message : "Unable to read proto files"
  } finally {
    input.value = ""
  }
}

const removeFile = (name: string) =>
  (protoFiles.value = protoFiles.value.filter((file) => file.name !== name))

const savePastedFile = (file: GRPCProtoFile) => {
  sourceError.value = ""
  protoFiles.value = mergeGRPCProtoFiles(protoFiles.value, [file])
}
</script>

<template>
  <div class="flex h-full flex-col gap-3 p-4">
    <div class="flex border-b border-divider">
      <button
        v-for="source in ['files', 'folder', 'paste'] as const"
        :key="source"
        type="button"
        class="px-4 py-2 capitalize"
        :class="
          activeSource === source &&
          'border-b-2 border-accent text-secondaryDark'
        "
        @click="activeSource = source"
      >
        {{ source }}
      </button>
    </div>

    <div v-if="activeSource === 'files'" class="flex flex-col gap-2">
      <label
        class="inline-flex w-fit cursor-pointer rounded bg-accent px-4 py-2 text-accentContrast"
      >
        Import .proto files
        <input
          class="hidden"
          type="file"
          accept=".proto"
          multiple
          @change="importFiles($event)"
        />
      </label>
      <p class="text-secondaryLight">
        Select one or more proto files and their local dependencies.
      </p>
    </div>

    <div v-else-if="activeSource === 'folder'" class="flex flex-col gap-2">
      <label
        class="inline-flex w-fit cursor-pointer rounded bg-accent px-4 py-2 text-accentContrast"
      >
        Import proto folder
        <input
          class="hidden"
          type="file"
          accept=".proto"
          multiple
          webkitdirectory
          @change="importFiles($event, true)"
        />
      </label>
      <p class="text-secondaryLight">
        The selected folder becomes the root for imported proto paths.
      </p>
    </div>

    <ProtoPaste
      v-else
      :existing-names="protoFiles.map((file) => file.name)"
      @save="savePastedFile"
    />

    <p v-if="loading" class="text-secondaryLight">Parsing proto files…</p>
    <p v-if="sourceError" class="text-red-500">{{ sourceError }}</p>
    <p v-if="error" class="text-red-500">{{ error }}</p>
    <div
      v-for="file in protoFiles"
      :key="file.name"
      class="flex items-center border-b border-divider py-2"
    >
      <span class="flex-1 truncate">{{ file.name }}</span>
      <HoppButtonSecondary
        :icon="IconTrash"
        title="Remove proto"
        @click="removeFile(file.name)"
      />
    </div>
  </div>
</template>
