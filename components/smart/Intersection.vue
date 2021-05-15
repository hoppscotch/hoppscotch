<template>
  <div ref="container">
    <slot />
  </div>
</template>
<script lang="ts">
/* 
  Implements a wrapper listening to viewport intersections via
  IntesectionObserver API

  Events
  ------
  intersecting (entry: IntersectionObserverEntry) -> When the component is intersecting the viewport
*/
import Vue from "vue"

export default Vue.extend({
  data() {
    return {
      observer: null as IntersectionObserver | null,
    }
  },
  mounted() {
    this.observer = new IntersectionObserver(([entry]) => {
      if (entry && entry.isIntersecting) {
        this.$emit("intersecting", entry)
      }
    })

    this.observer.observe(this.$refs.container as Element)
  },
  beforeDestroy() {
    this.observer?.disconnect()
  },
})
</script>
