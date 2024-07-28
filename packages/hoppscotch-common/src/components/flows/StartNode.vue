<template>
  <div
    class="bg-primary w-16 h-16 flex justify-center items-center border border-dividerLight rounded-full"
  >
    {{ t("flows.start") }}
  </div>

  <Handle type="source" :position="Position.Right" />
</template>

<script setup lang="ts">
import { Handle, Position } from "@vue-flow/core"
import { useI18n } from "~/composables/i18n"

const t = useI18n()
</script>
