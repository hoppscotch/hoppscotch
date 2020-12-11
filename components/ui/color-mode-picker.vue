<template>
  <div>
    <label>
      <ColorScheme placeholder="..." tag="span">
        {{ $t("background") }}:
        {{ $colorMode.preference.charAt(0).toUpperCase() + $colorMode.preference.slice(1) }}
        <span v-if="$colorMode.preference === 'system'">
          ({{ $colorMode.value }} mode detected)
        </span>
      </ColorScheme>
    </label>
    <div class="space-x-2">
      <span
        v-for="(color, index) of colors"
        :key="`color-${index}`"
        v-tooltip="`${color.charAt(0).toUpperCase()}${color.slice(1)}`"
        class="inline-flex items-center justify-center p-3 m-2 transition duration-200 ease-in-out bg-transparent rounded-full cursor-pointer border-collapseer-2 text-fgLightColor hover:text-fgColor hover:shadow-none"
        :class="[
          { 'bg-bgDarkColor': color === $colorMode.preference },
          { 'text-acColor hover:text-acColor': color === $colorMode.value },
        ]"
        @click="$colorMode.preference = color"
      >
        <i class="material-icons">{{ getIcon(color) }}</i>
      </span>
    </div>
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
