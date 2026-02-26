<template>
  <div class="flex items-center space-x-2">
    <div class="flex">
      <!-- preset buttons -->
      <HoppButtonSecondary
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

    <!-- custom color input -->
    <div class="flex items-center">
      <!-- wrapper to position the hidden input over the icon so the native picker anchors to the icon -->
      <div class="relative">
        <!-- palette icon button that opens the native color picker -->
        <button
          type="button"
          class="rounded py-1"
          title="Custom accent color"
          @click="openColorPicker"
        >
          <IconPalette class="w-5 h-5" />
        </button>

        <!-- overlay native color input (transparent) so the native color picker anchors to the icon -->
        <input
          ref="colorInputRef"
          class="color-picker absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          type="color"
          :value="customColorValue || '#000000'"
          aria-label="Pick custom accent color"
          @input="onCustomColorInput"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import IconCircle from "~icons/lucide/circle"
import IconCircleDot from "~icons/lucide/circle-dot"
import IconPalette from "~icons/lucide/palette"
import {
  HoppAccentColors,
  HoppAccentColor,
  applySetting,
} from "~/newstore/settings"
import { useSetting } from "@composables/settings"
import { ref } from "vue"

const accentColors = HoppAccentColors
const active = useSetting("THEME_COLOR")

const customColorValue = ref<string | null>(null)
const colorInputRef = ref<HTMLInputElement | null>(null)

const setActiveColor = (color: HoppAccentColor | string) => {
  if ((accentColors as readonly string[]).includes(color as string)) {
    document.documentElement.setAttribute("data-accent", color as string)
  } else {
    // custom color selected
    document.documentElement.setAttribute("data-accent", "custom")
  }
  applySetting("THEME_COLOR", color as string)
}

const onCustomColorInput = (e: Event) => {
  const v = (e.target as HTMLInputElement).value
  customColorValue.value = v
  setActiveColor(v)
}

const openColorPicker = () => {
  colorInputRef.value?.click()
}
</script>

<style scoped>
.color-picker[type="color"] {
  border: none;
  padding: 0;
}
</style>
