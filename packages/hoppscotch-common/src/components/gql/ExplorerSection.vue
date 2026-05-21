<template>
  <section class="flex flex-col">
    <div
      class="sticky top-0 z-[5] flex items-center justify-between bg-primary px-4 py-2"
    >
      <h3
        class="text-tiny font-semibold uppercase tracking-wide text-secondaryLight"
      >
        {{ title }}
      </h3>
    </div>
    <div class="hopp-doc-explorer-section-content">
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
type ExplorerSectionTitle =
  | "Root Types"
  | "Fields"
  | "Deprecated Fields"
  | "Type"
  | "Arguments"
  | "Deprecated Arguments"
  | "Implements"
  | "Implementations"
  | "Possible Types"
  | "Enum Values"
  | "Deprecated Enum Values"
  | "Directives"
  | "All Schema Types"

defineProps<{
  title: ExplorerSectionTitle
}>()
</script>
