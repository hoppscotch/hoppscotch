<template>
  <div class="flex">
    <!-- text-green-500 -->
    <!-- text-teal-500 -->
    <!-- text-blue-500 -->
    <!-- text-indigo-500 -->
    <!-- text-purple-500 -->
    <!-- text-yellow-500 -->
    <!-- text-orange-500 -->
    <!-- text-red-500 -->
    <!-- text-pink-500 -->
    <ButtonSecondary
      v-for="(color, index) of accentColors"
      :key="`color-${index}`"
      v-tippy="{ theme: 'tooltip' }"
      :title="`${color.charAt(0).toUpperCase()}${color.slice(1)}`"
      :class="[{ 'bg-primaryLight': color === active }]"
      class="rounded"
      :icon="color === active ? IconCircleDot : IconCircle"
      :color="color"
      @click="setActiveColor(color)"
    />
  </div>
</template>

<script setup lang="ts">
import IconCircle from "~icons/lucide/circle"
import IconCircleDot from "~icons/lucide/circle-dot"
import {
  HoppAccentColors,
  HoppAccentColor,
  applySetting,
} from "~/newstore/settings"
import { useSetting } from "@composables/settings"

const accentColors = HoppAccentColors
const active = useSetting("THEME_COLOR")

const setActiveColor = (color: HoppAccentColor) => {
  document.documentElement.setAttribute("data-accent", color)
  applySetting("THEME_COLOR", color)
}
</script>
