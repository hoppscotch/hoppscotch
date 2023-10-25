<template>
  <div
    class="group relative flex items-center bg-error px-4 py-2 text-tiny transition"
    role="alert"
  >
    <icon-lucide-info class="mr-2" />
    <span class="text-secondaryDark">
      <span class="md:hidden">
        {{ t("helpers.offline_short") }}
      </span>
      <span class="<md:hidden">
        {{ t("helpers.offline") }}
      </span>
    </span>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "~/composables/i18n"

const t = useI18n()
</script>
