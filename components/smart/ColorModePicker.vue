<template>
  <div class="flex flex-col">
    <label>
      <ColorScheme placeholder="..." tag="span">
        {{ $t("background") }}:
        {{ activeColor.charAt(0).toUpperCase() + activeColor.slice(1) }}
        <span v-if="activeColor === 'system'">
          ({{ $colorMode.value }} mode detected)
        </span>
      </ColorScheme>
    </label>
    <div>
      <span
        v-for="(color, index) of colors"
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
          text-secondaryLight
          hover:text-secondary
        "
        :class="[
          { 'bg-primary': color === activeColor },
          { 'text-accent hover:text-accent': color === activeColor },
        ]"
        @click="setBGMode(color)"
      >
        <i class="material-icons">{{ getIcon(color) }}</i>
      </span>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from "vue"
import {
  applySetting,
  getSettingSubject,
  HoppBgColor,
  HoppBgColors,
} from "~/newstore/settings"

export default Vue.extend({
  data() {
    return {
      colors: HoppBgColors,
    }
  },
  subscriptions() {
    return {
      activeColor: getSettingSubject("BG_COLOR"),
    }
  },
  methods: {
    setBGMode(color: HoppBgColor) {
      applySetting("BG_COLOR", color)
    },
    getIcon(color: HoppBgColor) {
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
})
</script>
