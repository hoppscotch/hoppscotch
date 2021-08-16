<template>
  <div class="flex">
    <ButtonSecondary
      v-for="(color, index) of colors"
      :key="`color-${index}`"
      v-tippy="{ theme: 'tooltip' }"
      :title="$t(getColorModeName(color))"
      :class="{
        'bg-primaryLight !text-accent hover:text-accent': color === active,
      }"
      class="rounded"
      :icon="getIcon(color)"
      @click.native="setBGMode(color)"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent } from "@nuxtjs/composition-api"
import {
  applySetting,
  HoppBgColor,
  HoppBgColors,
  useSetting,
} from "~/newstore/settings"

export default defineComponent({
  setup() {
    return {
      colors: HoppBgColors,
      active: useSetting("BG_COLOR"),
    }
  },
  methods: {
    setBGMode(color: HoppBgColor) {
      applySetting("BG_COLOR", color)
    },
    getIcon(color: HoppBgColor) {
      switch (color) {
        case "system":
          return "devices"
        case "light":
          return "light_mode"
        case "dark":
          return "nights_stay"
        case "black":
          return "dark_mode"
        default:
          return "devices"
      }
    },
    getColorModeName(colorMode: string) {
      switch (colorMode) {
        case "system":
          return "settings.system_mode"
        case "light":
          return "settings.light_mode"
        case "dark":
          return "settings.dark_mode"
        case "black":
          return "settings.black_mode"
        default:
          return "settings.system_mode"
      }
    },
  },
})
</script>
