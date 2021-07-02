<template>
  <div class="flex flex-col">
    <label>{{ $t("color") }}: {{ capitalized(active) }}</label>
    <div>
      <!-- text-blue-400 -->
      <!-- text-green-400 -->
      <!-- text-teal-400 -->
      <!-- text-indigo-400 -->
      <!-- text-purple-400 -->
      <!-- text-orange-400 -->
      <!-- text-pink-400 -->
      <!-- text-red-400 -->
      <!-- text-yellow-400 -->
      <span
        v-for="(color, index) of accentColors"
        :key="`color-${index}`"
        v-tippy="{ theme: 'tooltip' }"
        title="capitalized(color)"
        class="
          inline-flex
          items-center
          justify-center
          p-3
          m-2
          transition
          duration-150
          ease-in-out
          bg-transparent
          rounded-full
          cursor-pointer
          hover:shadow-none
        "
        :class="[`text-${color}-400`, { 'bg-primary': color === active }]"
        @click="setActiveColor(color)"
      >
        <i class="material-icons">lens</i>
      </span>
    </div>
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
    capitalized(color) {
      return `${color.charAt(0).toUpperCase()}${color.slice(1)}`
    },
  },
}
</script>
