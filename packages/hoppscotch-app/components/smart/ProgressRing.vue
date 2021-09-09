<template>
  <svg :height="radius * 2" :width="radius * 2">
    <circle
      :stroke-width="stroke"
      class="stroke-green-500"
      fill="transparent"
      :r="normalizedRadius"
      :cx="radius"
      :cy="radius"
    />
    <circle
      :stroke-width="stroke"
      stroke="currentColor"
      fill="transparent"
      :r="normalizedRadius"
      :cx="radius"
      :cy="radius"
      :style="{ strokeDashoffset: strokeDashoffset }"
      :stroke-dasharray="circumference + ' ' + circumference"
    />
  </svg>
</template>

<script>
import { defineComponent } from "@nuxtjs/composition-api"

export default defineComponent({
  props: {
    radius: {
      type: Number,
      default: 12,
    },
    progress: {
      type: Number,
      default: 50,
    },
    stroke: {
      type: Number,
      default: 4,
    },
  },
  data() {
    const normalizedRadius = this.radius - this.stroke * 2
    const circumference = normalizedRadius * 2 * Math.PI

    return {
      normalizedRadius,
      circumference,
    }
  },
  computed: {
    strokeDashoffset() {
      return this.circumference - (this.progress / 100) * this.circumference
    },
  },
})
</script>
