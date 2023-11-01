<template>
  <div
    class="flex items-center px-4 py-2 text-tiny"
    :class="bannerColor"
    :role="bannerRole"
  >
    <icon-lucide-info
      v-if="banner.type === 'info'"
      class="mr-2 text-secondaryDark"
    />
    <icon-lucide-alert-circle
      v-else-if="banner.type === 'warning'"
      class="mr-2 text-secondaryDark"
    />
    <icon-lucide-alert-triangle v-else class="mr-2 text-secondaryDark" />

    <span class="text-secondaryDark">
      <span v-if="banner.alternateText" class="md:hidden">
        {{ banner.alternateText }}
      </span>
      <span class="<md:hidden">
        {{ banner.text }}
      </span>
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import { BannerContent, BannerType } from "~/services/banner.service"

const props = defineProps<{
  banner: BannerContent
}>()

const bgColors: Record<BannerType, string> = {
  error: "bg-red-700",
  warning: "bg-yellow-700",
  info: "bg-stone-800",
}

const role: Record<BannerType, string> = {
  error: "alert",
  warning: "status",
  info: "status",
}

const bannerColor = computed(() => bgColors[props.banner.type])
const bannerRole = computed(() => role[props.banner.type])
</script>
