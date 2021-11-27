<template>
  <div class="bg-error flex justify-between">
    <span
      class="group relative flex items-center justify-center px-4 py-2 transition"
    >
      <i class="material-icons mr-2">info_outline</i>
      <span class="text-secondaryDark">
        <span class="md:hidden">
          {{ t("helpers.offline_short") }}
        </span>
        <span class="md:inline hidden">
          {{ t("helpers.offline") }}
        </span>
      </span>
    </span>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "~/helpers/utils/composables"

const t = useI18n()
</script>
