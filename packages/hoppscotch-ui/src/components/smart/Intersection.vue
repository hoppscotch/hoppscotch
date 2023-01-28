<template>
  <div ref="container">
    <slot></slot>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue"

/*
  Implements a wrapper listening to viewport intersections via
  IntersectionObserver API

  Events
  ------
  intersecting (entry: IntersectionObserverEntry) -> When the component is intersecting the viewport
*/
const observer = ref<IntersectionObserver>()
const container = ref<Element>()

const emit = defineEmits<{
  (e: "intersecting", entry: IntersectionObserverEntry): void
}>()

onMounted(() => {
  observer.value = new IntersectionObserver(([entry]) => {
    if (entry && entry.isIntersecting) {
      emit("intersecting", entry)
    }
  })

  observer.value.observe(container.value!)
})

onBeforeUnmount(() => {
  observer.value!.disconnect()
})
</script>
