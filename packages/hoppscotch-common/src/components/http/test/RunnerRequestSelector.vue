<template>
  <div class="flex flex-col">
    <label
      v-for="entry in entries"
      :key="entry.id"
      class="flex items-center gap-2 py-1.5 cursor-pointer text-secondaryDark"
      :style="{ paddingLeft: `${entry.depth * 16}px` }"
    >
      <HoppSmartCheckbox :on="entry.selected" @change="entry.onToggle()" />
      <component
        :is="IconFolder"
        v-if="entry.type === 'folder'"
        class="svg-icons text-secondaryLight"
      />
      <span
        v-else
        class="font-bold text-tiny"
        :style="{ color: entry.methodColor }"
      >
        {{ entry.method }}
      </span>
      <span class="truncate">{{ entry.name }}</span>
    </label>
  </div>
</template>

<script setup lang="ts">
import { HoppCollection, HoppRESTRequest } from "@hoppscotch/data"
import { computed } from "vue"
import { getMethodLabelColorClassOf } from "~/helpers/rest/labelColoring"
import {
  collectRequestIDs,
  getRequestSelectionID,
} from "~/helpers/runner/selection"
import IconFolder from "~icons/lucide/folder"

const props = defineProps<{
  collection: HoppCollection
  selectedIDs: Set<string>
}>()

const emit = defineEmits<{
  (e: "toggle", id: string): void
}>()

type Entry =
  | {
      id: string
      type: "folder"
      name: string
      depth: number
      selected: boolean
      onToggle: () => void
    }
  | {
      id: string
      type: "request"
      name: string
      method: string
      methodColor: string
      depth: number
      selected: boolean
      onToggle: () => void
    }

const flatten = (
  collection: HoppCollection,
  parentPath: number[],
  depth: number
): Entry[] => {
  const folders = collection.folders.flatMap((folder, index): Entry[] => {
    const path = [...parentPath, index]
    const ids = collectRequestIDs(folder, path)
    const allSelected =
      ids.length > 0 && ids.every((id) => props.selectedIDs.has(id))

    return [
      {
        id: `folder-${path.join("/")}`,
        type: "folder",
        name: folder.name,
        depth,
        selected: allSelected,
        // Select-all / deselect-all: only toggle the requests whose current
        // state differs from the target, so already-correct ones are untouched.
        onToggle: () =>
          ids.forEach((id) => {
            if (props.selectedIDs.has(id) === allSelected) emit("toggle", id)
          }),
      },
      ...flatten(folder, path, depth + 1),
    ]
  })

  const requests = collection.requests.map((request, index): Entry => {
    const path = [...parentPath, index]
    const id = getRequestSelectionID(request as HoppRESTRequest, path)

    return {
      id: `request-${path.join("/")}`,
      type: "request",
      name: request.name,
      method: request.method,
      methodColor: getMethodLabelColorClassOf(request.method),
      depth,
      selected: props.selectedIDs.has(id),
      onToggle: () => emit("toggle", id),
    }
  })

  return [...folders, ...requests]
}

const entries = computed(() => flatten(props.collection, [], 0))
</script>
