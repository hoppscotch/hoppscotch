<template>
  <div
    :role="bannerRole"
    class="flex items-center justify-between px-4 py-2 text-tiny text-secondaryDark"
    :class="bannerColor"
  >
    <div class="flex items-center">
      <component :is="bannerIcon" class="mr-2" />
      <span :class="{ 'hidden sm:inline-flex': banner.alternateText }">
        {{ banner.text(t) }}
      </span>
      <span v-if="banner.alternateText" class="inline-flex sm:hidden">
        {{ banner.alternateText(t) }}
      </span>
    </div>
    <icon-lucide-x
      v-if="banner.dismissible"
      class="opacity-50 hover:cursor-pointer hover:opacity-100"
      @click="emit('dismiss')"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import { BannerContent, BannerTypes } from "~/services/banner.service"
import { useI18n } from "@composables/i18n"

import IconAlertCircle from "~icons/lucide/alert-circle"
import IconAlertTriangle from "~icons/lucide/alert-triangle"
import IconInfo from "~icons/lucide/info"

const props = defineProps<{
  banner: BannerContent
}>()

const t = useI18n()

const emit = defineEmits<{
  (e: "dismiss"): void
}>()

const ariaRoles: Record<BannerTypes, string> = {
  [BannerTypes.Info]: "status",
  [BannerTypes.Warning]: "status",
  [BannerTypes.Error]: "alert",
}

const bgColors: Record<BannerTypes, string> = {
  [BannerTypes.Info]: "bg-bannerInfo",
  [BannerTypes.Warning]: "bg-bannerWarning",
  [BannerTypes.Error]: "bg-bannerError",
}

const icons = {
  [BannerTypes.Info]: IconInfo,
  [BannerTypes.Warning]: IconAlertCircle,
  [BannerTypes.Error]: IconAlertTriangle,
}

const bannerColor = computed(() => bgColors[props.banner.type])
const bannerIcon = computed(() => icons[props.banner.type])
const bannerRole = computed(() => ariaRoles[props.banner.type])
</script>
