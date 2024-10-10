<template>
  <div class="flex flex-col">
    <div
      v-for="(mode, index) of modes"
      :key="`mode-${index}`"
      class="flex w-fit"
    >
      <HoppSmartRadio
        v-tippy="{ theme: 'tooltip' }"
        :value="mode"
        :label="t(getEncodingModeName(mode))"
        :title="t(getEncodeingModeTooltip(mode))"
        :selected="mode === activeMode"
        :class="'!px-0 hover:bg-transparent'"
        @change="changeMode(mode)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { EncodeModes, EncodeMode, applySetting } from "~/newstore/settings"
import { useSetting } from "@composables/settings"
import { useI18n } from "~/composables/i18n"

const t = useI18n()

const modes = EncodeModes
const activeMode = useSetting("ENCODE_MODE")

const changeMode = (mode: EncodeMode) => {
  applySetting("ENCODE_MODE", mode)
}

const getEncodingModeName = (mode: string) => {
  switch (mode) {
    case "encode":
      return "settings.encode_mode"
    case "disable":
      return "settings.disable_mode"
    case "auto":
      return "settings.auto_mode"
    default:
      return "settings.encode_mode"
  }
}

const getEncodeingModeTooltip = (mode: string) => {
  switch (mode) {
    case "encode":
      return "settings.encode_mode_tooltip"
    case "disable":
      return "settings.disable_mode_tooltip"
    case "auto":
      return "settings.auto_mode_tooltip"
    default:
      return "settings.encode_mode_tooltip"
  }
}
</script>
