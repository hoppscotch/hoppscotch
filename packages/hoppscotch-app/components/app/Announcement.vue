<template>
  <div
    class="relative flex items-center px-4 py-2 transition bg-error text-tiny group"
    role="alert"
  >
    <i class="mr-2 material-icons">info_outline</i>
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
import { useI18n } from "~/helpers/utils/composables"

const t = useI18n()
</script>
