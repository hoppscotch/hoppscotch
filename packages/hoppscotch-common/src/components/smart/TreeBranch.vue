<template>
  <slot name="content" :toggle-children="toggleChildren"></slot>
  <div v-if="showChildren" class="px-5">
    <slot name="child"> </slot>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue"

const showChildren = ref(false)

const toggleChildren = () => {
  console.log("toggle")
  showChildren.value = !showChildren.value
}
</script>
