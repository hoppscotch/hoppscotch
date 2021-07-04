<template>
  <div class="flex">
    <!-- text-blue-400 -->
    <!-- text-green-400 -->
    <!-- text-teal-400 -->
    <!-- text-indigo-400 -->
    <!-- text-purple-400 -->
    <!-- text-orange-400 -->
    <!-- text-pink-400 -->
    <!-- text-red-400 -->
    <!-- text-yellow-400 -->
    <ButtonSecondary
      v-for="(color, index) of accentColors"
      :key="`color-${index}`"
      v-tippy="{ theme: 'tooltip' }"
      :title="`${color.charAt(0).toUpperCase()}${color.slice(1)}`"
      :class="[`text-${color}-400`, { 'bg-primary': color === active }]"
      icon="lens"
      @click.native="setActiveColor(color)"
    />
  </div>
</template>

<script>
import { getLocalConfig, setLocalConfig } from "~/newstore/localpersistence"

export default {
  data() {
    return {
      active: getLocalConfig("THEME_COLOR") || "green",
      accentColors: [
        "blue",
        "green",
        "teal",
        "indigo",
        "purple",
        "orange",
        "pink",
        "red",
        "yellow",
      ],
    }
  },
  watch: {
    active(color) {
      setLocalConfig("THEME_COLOR", color)
    },
  },
  methods: {
    setActiveColor(color) {
      document.documentElement.setAttribute("data-accent", color)
      this.active = color
    },
  },
}
</script>
