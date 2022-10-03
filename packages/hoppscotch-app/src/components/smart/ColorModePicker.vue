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
      :icon="getIcon(color)"
      @click="setBGMode(color)"
    />
  </div>
</template>

<script setup lang="ts">
import IconMonitor from "~icons/lucide/monitor"
import IconSun from "~icons/lucide/sun"
import IconCloud from "~icons/lucide/cloud"
import IconMoon from "~icons/lucide/moon"
import { applySetting, HoppBgColor, HoppBgColors } from "~/newstore/settings"
import { useSetting } from "@composables/settings"
import { useI18n } from "@composables/i18n"

const t = useI18n()

const colors = HoppBgColors
const active = useSetting("BG_COLOR")

const setBGMode = (color: HoppBgColor) => {
  applySetting("BG_COLOR", color)
}

const getIcon = (color: HoppBgColor) => {
  switch (color) {
    case "system":
      return IconMonitor
    case "light":
      return IconSun
    case "dark":
      return IconCloud
    case "black":
      return IconMoon
    default:
      return IconMonitor
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
