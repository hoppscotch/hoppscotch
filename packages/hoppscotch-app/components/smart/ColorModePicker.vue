<template>
  <div class="flex">
    <ButtonSecondary
      v-for="(color, index) of colors"
      :key="`color-${index}`"
      v-tippy="{ theme: 'tooltip' }"
      :title="t(getColorModeName(color))"
      :class="{
        'bg-primaryLight !text-accent hover:text-accent': color === active,
      }"
      class="rounded"
      :svg="getIcon(color)"
      @click.native="setBGMode(color)"
    />
  </div>
</template>

<script setup lang="ts">
import {
  applySetting,
  HoppBgColor,
  HoppBgColors,
  useSetting,
} from "~/newstore/settings"
import { useI18n } from "~/helpers/utils/composables"

const t = useI18n()

const colors = HoppBgColors
const active = useSetting("BG_COLOR")

const setBGMode = (color: HoppBgColor) => {
  applySetting("BG_COLOR", color)
}

const getIcon = (color: HoppBgColor) => {
  switch (color) {
    case "system":
      return "monitor"
    case "light":
      return "sun"
    case "dark":
      return "cloud"
    case "black":
      return "moon"
    default:
      return "monitor"
  }
}

const getColorModeName = (colorMode: string) => {
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
}
</script>
