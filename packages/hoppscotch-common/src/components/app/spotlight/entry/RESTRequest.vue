<template>
  <span class="flex space-x-2 items-center">
    <span
      v-if="request"
      class="font-semibold truncate text-tiny flex flex-shrink-0 border border-dividerDark rounded-md px-1"
      :class="getMethodLabelColorClassOf(request)"
    >
      {{ request.method.toUpperCase() }}
    </span>

    <template v-for="(folder, index) in pathFolders" :key="index">
      <span class="block" :class="{ truncate: index !== 0 }">{{
        folder.name
      }}</span>
      <icon-lucide-chevron-right class="flex flex-shrink-0 items-center" />
    </template>

    <span v-if="request">
      {{ request.name }}
    </span>
  </span>
</template>

<script setup lang="ts">
import { HoppCollection, HoppRESTRequest } from "@hoppscotch/data"
import { computed } from "vue"
import { restCollectionStore } from "~/newstore/collections"
import { getMethodLabelColorClassOf } from "~/helpers/rest/labelColoring"

const props = defineProps<{
  folderPath: string
}>()

const pathFolders = computed(() => {
  try {
    const folderIndicies = props.folderPath
      .split("/")
      .slice(0, -1)
      .map((x) => parseInt(x))

    const pathItems: HoppCollection<HoppRESTRequest>[] = []

    let currentFolder = restCollectionStore.value.state[folderIndicies.shift()!]
    pathItems.push(currentFolder)

    while (folderIndicies.length > 0) {
      const folderIndex = folderIndicies.shift()!

      const folder = currentFolder.folders[folderIndex]
      pathItems.push(folder)

      currentFolder = folder
    }

    return pathItems
  } catch (e) {
    console.error(e)
    return []
  }
})

const request = computed(() => {
  try {
    const requestIndex = parseInt(props.folderPath.split("/").at(-1)!)

    return pathFolders.value[pathFolders.value.length - 1].requests[
      requestIndex
    ]
  } catch (e) {
    return null
  }
})
</script>
