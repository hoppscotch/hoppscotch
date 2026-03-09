<template>
  <div ref="container" class="lazy-item-container">
    <div v-if="shouldRender" class="lazy-item-content">
      <slot></slot>
    </div>
    <div
      v-else
      class="lazy-item-placeholder"
      :style="{ height: placeholderHeight }"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue"
import { useIntersectionObserver } from "@vueuse/core"

const props = defineProps({
  minHeight: {
    type: String,
    default: "100px",
  },
  forceRender: {
    type: Boolean,
    default: false,
  },
})

const container = ref<HTMLElement | null>(null)
const shouldRender = ref(false)
const placeholderHeight = ref(props.minHeight)

import { watch } from "vue"

watch(
  () => props.forceRender,
  (newVal) => {
    if (newVal) {
      shouldRender.value = true
    }
  },
  { immediate: true }
)

// Once rendered, keep it rendered to avoid flickering
const { stop } = useIntersectionObserver(
  container,
  ([{ isIntersecting }]) => {
    if (isIntersecting || props.forceRender) {
      shouldRender.value = true
      stop() // Stop observing once rendered
    }
  },
  {
    rootMargin: "600px 0px 600px 0px", // Pre-load items well before they enter viewport
    threshold: 0.01,
  }
)
</script>

<style scoped>
.lazy-item-container {
  width: 100%;
}

.lazy-item-placeholder {
  width: 100%;
  background: transparent;
}
</style>
