<template>
  <div
    :role="bannerRole"
    class="flex items-center px-4 py-2 text-tiny"
    :class="bannerColor"
  >
    <component :is="bannerIcon" class="mr-2 text-white" />

    <span class="text-white">
      <span v-if="banner.alternateText" class="md:hidden">
        {{ banner.alternateText(t) }}
      </span>
      <span :class="banner.alternateText ? '<md:hidden' : ''">
        {{ banner.text(t) }}
      </span>
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import { BannerContent, BannerType } from "~/services/banner.service"
import { useI18n } from "@composables/i18n"

import IconAlertCircle from "~icons/lucide/alert-circle"
import IconAlertTriangle from "~icons/lucide/alert-triangle"
import IconInfo from "~icons/lucide/info"

const props = defineProps<{
  banner: BannerContent
}>()

const t = useI18n()

const ariaRoles: Record<BannerType, string> = {
  error: "alert",
  warning: "status",
  info: "status",
}

const bgColors: Record<BannerType, string> = {
  error: "bg-red-700",
  warning: "bg-yellow-700",
  info: "bg-stone-800",
}

const icons = {
  info: IconInfo,
  warning: IconAlertCircle,
  error: IconAlertTriangle,
}

const bannerColor = computed(() => bgColors[props.banner.type])
const bannerIcon = computed(() => icons[props.banner.type])
const bannerRole = computed(() => ariaRoles[props.banner.type])
</script>
