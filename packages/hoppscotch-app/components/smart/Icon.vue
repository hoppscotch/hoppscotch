<template>
  <component :is="src" />
</template>

<script setup lang="ts">
import { computed } from "@nuxtjs/composition-api"

const props = defineProps<{
  name: String
}>()

const src = computed(() => {
  return require(`~/assets/icons/${props.name}.svg?inline`)
})
</script>
