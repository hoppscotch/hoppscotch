<template>
  <div class="flex">
    <ButtonSecondary
      v-for="(color, index) of colors"
      :key="`color-${index}`"
      v-tippy="{ theme: 'tooltip' }"
      :title="`${color.charAt(0).toUpperCase()}${color.slice(1)}`"
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
