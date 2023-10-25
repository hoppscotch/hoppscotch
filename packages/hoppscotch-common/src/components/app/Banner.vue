<template>
  <div
    v-if="banner"
    class="relative flex items-center px-4 py-2 transition text-tiny group"
    :class="getBannerColor(banner.type)"
  >
    <icon-lucide-info class="mr-2 text-white" />
    <span class="text-secondaryDark">
      <span v-if="banner.alternateText" class="md:hidden">
        {{ banner.alternateText(t) }}
      </span>
      <span class="<md:hidden">
        {{ banner.text(t) }}
      </span>
    </span>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "~/composables/i18n"
import { BannerContent, BannerType } from "~/services/banner.service"

const t = useI18n()

defineProps<{
  banner: BannerContent
}>()

const getBannerColor = (type: BannerType): string =>
  type === "error"
    ? "bg-red-700"
    : type === "warning"
    ? "bg-yellow-700"
    : "bg-error"
</script>
