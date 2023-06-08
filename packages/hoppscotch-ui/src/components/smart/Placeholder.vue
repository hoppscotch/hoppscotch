<template>
  <div
    class="flex flex-col items-center justify-center p-4 text-secondaryLight"
  >
    <img
      :src="src"
      loading="lazy"
      class="inline-flex flex-col object-contain object-center w-16 h-16 mb-4"
      :alt="alt"
    />
    <span class="pb-4 text-center">
      {{ text }}
    </span>

    <slot></slot>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    src: string
    alt?: string
    text?: string
  }>(),
  {
    alt: "",
    text: "",
  }
)
</script>
