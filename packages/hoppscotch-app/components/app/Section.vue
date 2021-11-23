<template>
  <section :id="label.toLowerCase()" class="relative flex flex-col flex-1">
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
