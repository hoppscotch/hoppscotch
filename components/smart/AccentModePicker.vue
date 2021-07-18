<template>
  <div class="flex">
    <!-- text-blue-400 -->
    <!-- text-green-400 -->
    <!-- text-teal-400 -->
    <!-- text-indigo-400 -->
    <!-- text-purple-400 -->
    <!-- text-orange-400 -->
    <!-- text-pink-400 -->
    <!-- text-red-400 -->
    <!-- text-yellow-400 -->
    <ButtonSecondary
      v-for="(color, index) of accentColors"
      :key="`color-${index}`"
      v-tippy="{ theme: 'tooltip' }"
      :title="`${color.charAt(0).toUpperCase()}${color.slice(1)}`"
      :class="[{ 'bg-primaryLight': color === active }]"
      icon="lens"
      :color="color"
      @click.native="setActiveColor(color)"
    />
  </div>
</template>

<script lang="ts">
import Vue from "vue"
import {
  HoppAccentColors,
  HoppAccentColor,
  getSettingSubject,
  settingsStore,
  applySetting,
} from "~/newstore/settings"

export default Vue.extend({
  data() {
    return {
      accentColors: HoppAccentColors,
      active: settingsStore.value.THEME_COLOR,
    }
  },
  subscriptions() {
    return {
      active: getSettingSubject("THEME_COLOR"),
    }
  },
  methods: {
    setActiveColor(color: HoppAccentColor) {
      document.documentElement.setAttribute("data-accent", color)

      applySetting("THEME_COLOR", color)
    },
  },
})
</script>
