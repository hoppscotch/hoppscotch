<template>
  <div class="bg-error flex justify-between">
    <span
      class="flex py-2 px-4 transition justify-center group relative items-center"
    >
      <i class="mr-2 material-icons">info_outline</i>
      <span class="text-secondaryDark">
        <span class="md:hidden">
          {{ t("helpers.offline_short") }}
        </span>
        <span class="hidden md:inline">
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
