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
defineProps<{
  // Plain string, not a title union — call sites pass i18n output
  // (e.g. t("graphql.fields")), which only types as `string`
  title: string
}>()
</script>
