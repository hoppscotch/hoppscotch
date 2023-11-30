<template>
  <div
    :role="bannerRole"
    class="flex items-center justify-between px-4 py-2 text-tiny"
    :class="bannerColor"
  >
    <div class="flex items-center">
      <component :is="bannerIcon" class="mr-2 text-secondaryDark" />

      <span class="text-secondaryDark">
        <span v-if="banner.alternateText" class="md:hidden">
          {{ banner.alternateText(t) }}
        </span>
        <span :class="{ '<md:hidden': banner.alternateText }">
          {{ banner.text(t) }}
        </span>
      </span>
    </div>

    <icon-lucide-x
      v-if="dismissible"
      class="text-white hover:cursor-pointer hover:text-gray-300"
      @click="emit('dismiss')"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import { BannerContent, BannerType } from "~/services/banner.service"
import { useI18n } from "@composables/i18n"

import IconAlertCircle from "~icons/lucide/alert-circle"
import IconAlertTriangle from "~icons/lucide/alert-triangle"
import IconInfo from "~icons/lucide/info"

const props = withDefaults(
  defineProps<{
    banner: BannerContent
    dismissible?: boolean
  }>(),
  {
    dismissible: false,
  }
)

const t = useI18n()

const emit = defineEmits<{
  (e: "dismiss"): void
}>()

const ariaRoles: Record<BannerType, string> = {
  info: "status",
  warning: "status",
  error: "alert",
}

const bgColors: Record<BannerType, string> = {
  info: "bg-info",
  warning: "bg-warning",
  error: "bg-error",
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
