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
          :class="['rounded p-2', { 'bg-primaryLight': activeIsCustom }]"
          title="Custom accent color"
          aria-label="Custom accent color"
          aria-haspopup="dialog"
          @click="openColorPicker"
        >
          <IconPalette :style="{ color: paletteIconColor }" class="w-5 h-5" />
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
import { ref, computed } from "vue"
import { isPresetAccentColor } from "~/helpers/theme"

const accentColors = HoppAccentColors
const active = useSetting("THEME_COLOR")

const customColorValue = ref<string | null>(null)

if (active.value && !isPresetAccentColor(active.value)) {
  // Initialize the custom color picker with the currently active custom theme color
  customColorValue.value = active.value as string
}
const colorInputRef = ref<HTMLInputElement | null>(null)

const activeIsCustom = computed(
  () => !!active.value && !isPresetAccentColor(active.value)
)

const paletteIconColor = computed<string | undefined>(() => {
  if (active.value && !isPresetAccentColor(active.value)) {
    return active.value as string
  }
  return undefined
})

const setActiveColor = (color: HoppAccentColor | string) => {
  // Do not mutate DOM here - theming module watches THEME_COLOR and updates
  // documentElement (data-accent and inline CSS vars). Only persist the
  // new value; the theming runtime is the single source of truth.
  applySetting("THEME_COLOR", color)
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
