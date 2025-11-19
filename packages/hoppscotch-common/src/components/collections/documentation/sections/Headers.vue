<template>
  <div v-if="hasItems(headers)" class="max-w-2xl space-y-2">
    <h2
      class="text-sm font-semibold text-secondaryDark flex items-end px-4 p-2 border-b border-divider"
    >
      <span>Headers</span>
    </h2>
    <div class="px-4 py-2 flex flex-col">
      <div class="space-y-3">
        <div
          v-for="(header, index) in headers"
          :key="index"
          class="flex items-center space-x-4"
        >
          <div class="flex items-center">
            <span class="font-medium text-secondaryDark w-32">{{
              header.key
            }}</span>
            <span class="px-1 w-64">{{ header.value }}</span>
            <span
              v-if="header.description"
              class="px-1 w-52 text-xs text-secondaryLight"
            >
              {{ header.description }}
            </span>
          </div>
          <div class="flex items-center">
            <span
              class="px-2 py-0.5 text-xs rounded"
              :class="
                header.active
                  ? 'bg-green-500/20 text-green-500'
                  : 'bg-red-500/20 text-red-500'
              "
            >
              {{ header.active ? "Active" : "Inactive" }}
            </span>
          </div>
        </div>
        <div
          v-if="headers.length === 0"
          class="text-secondaryLight text-sm py-1"
        >
          No headers defined
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { HoppRESTHeader } from "@hoppscotch/data"

defineProps<{
  headers: HoppRESTHeader[]
}>()

function hasItems<T>(value: T[] | undefined): boolean {
  return !!value && value.length > 0
}
</script>
