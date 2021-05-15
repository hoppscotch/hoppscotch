<template>
  <div class="flex flex-col">
    <label>{{ $t("color") }}: {{ active.charAt(0).toUpperCase() + active.slice(1) }}</label>
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
        v-tooltip="`${color.charAt(0).toUpperCase()}${color.slice(1)}`"
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
        :class="[`text-${color}-400`, { 'bg-actColor': color === active }]"
        @click="setActiveColor(color)"
      >
        <i class="material-icons">lens</i>
      </span>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      active: localStorage.getItem("THEME_COLOR") || "green",
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
  methods: {
    setActiveColor(color) {
      document.documentElement.setAttribute("data-accent", color)
      this.active = color
    },
  },
  watch: {
    active(color) {
      localStorage.setItem("THEME_COLOR", color)
    },
  },
}
</script>
