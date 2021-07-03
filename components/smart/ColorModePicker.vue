<template>
  <div class="flex flex-col">
    <label>
      <ColorScheme placeholder="..." tag="span">
        {{ $t("background") }}:
        {{
          $colorMode.preference.charAt(0).toUpperCase() +
          $colorMode.preference.slice(1)
        }}
        <span v-if="$colorMode.preference === 'system'">
          ({{ $colorMode.value }} mode detected)
        </span>
      </ColorScheme>
    </label>
    <div>
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
