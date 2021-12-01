<template>
  <section :id="label.toLowerCase()" class="flex flex-col flex-1 relative">
    <slot></slot>
  </section>
</template>

<script setup lang="ts">
defineProps({
  label: {
    type: String,
    default: "Section",
  },
})
</script>
