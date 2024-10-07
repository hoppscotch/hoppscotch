<template>
  <div class="my-1 text-secondaryLight">
    <!-- {{ settings.encoding_description }} -->
    Use encoding for parameters in requests
  </div>
  <div class="flex flex-col">
    <div v-for="(mode, index) of modes" :key="`mode-${index}`" class="flex">
      <HoppSmartRadio
        v-b-tooltip.hover
        :value="`index`"
        :label="mode"
        :selected="mode === active"
        :class="'!px-0 hover:bg-transparent'"
        :title="tooltip(mode)"
        @change="change(mode)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { EncodeModes, EncodeMode, applySetting } from "~/newstore/settings"
import { useSetting } from "@composables/settings"

const modes = EncodeModes
const active = useSetting("ENCODE_MODE")

const change = (mode: EncodeMode) => {
  applySetting("ENCODE_MODE", mode)
}

const tooltip = (mode: EncodeMode) => {
  switch (mode.toLowerCase()) {
    case "encode":
      return "Always encode the parameters in the request."
    case "disable":
      return "Never encode the parameters in the request."
    case "auto":
      return "Encode the parameters in the request only if some special characters are present."
    default:
      return "Unknown"
  }
}
</script>
