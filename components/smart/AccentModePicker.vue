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
