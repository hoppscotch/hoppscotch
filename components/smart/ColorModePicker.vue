<template>
  <div class="flex">
    <ButtonSecondary
      v-for="(color, index) of colors"
      :key="`color-${index}`"
      v-tippy="{ theme: 'tooltip' }"
      :title="`${color.charAt(0).toUpperCase()}${color.slice(1)}`"
      :class="[
        { 'bg-primary': color === $colorMode.preference },
        { 'text-accent hover:text-accent': color === $colorMode.value },
      ]"
      :icon="getIcon(color)"
      @click.native="$colorMode.preference = color"
    />
  </div>
</template>

<script>
export default {
  data() {
    return {
      colors: ["system", "light", "dark", "black"],
    }
  },
  methods: {
    getIcon(color) {
      switch (color) {
        case "system":
          return "desktop_windows"
        case "light":
          return "wb_sunny"
        case "dark":
          return "nights_stay"
        case "black":
          return "bedtime"
        default:
          return "desktop_windows"
      }
    },
  },
}
</script>
