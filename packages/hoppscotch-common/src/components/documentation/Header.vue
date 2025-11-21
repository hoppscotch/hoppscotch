<template>
  <header class="border-b border-divider bg-primary sticky top-0 z-10">
    <div class="px-6 py-4">
      <div class="flex items-center justify-between">
        <div>
          <span
            class="!font-bold uppercase tracking-wide !text-secondaryDark pr-1"
          >
            {{ instanceDisplayName }}
          </span>
        </div>
        <div class="flex items-center gap-4">
          <h1 class="text-md font-bold text-secondaryDark">
            {{ publishedDoc?.title || "Untitled Project" }}
          </h1>
          <span
            v-if="publishedDoc?.version"
            class="px-2 py-0.5 text-xs font-medium rounded-md bg-accent/10 text-accent"
          >
            {{ publishedDoc.version }}
          </span>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { PropType } from "vue"
import { PublishedDocs } from "~/helpers/backend/graphql"

defineProps({
  publishedDoc: {
    type: Object as PropType<Partial<PublishedDocs> | null>,
    default: null,
  },
  instanceDisplayName: {
    type: String,
    default: "Hoppscotch",
  },
})
</script>
