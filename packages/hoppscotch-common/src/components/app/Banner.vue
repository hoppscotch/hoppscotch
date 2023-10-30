<template>
  <div class="flex items-center px-4 py-2 text-tiny" :class="bannerColor">
    <icon-lucide-info class="mr-2 text-white" />
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

const bannerColor = computed(() => {
  const bgColors: Record<BannerType, string> = {
    error: "bg-red-700",
    warning: "bg-yellow-700",
    info: "bg-stone-800",
  }
  return bgColors[props.banner.type]
})
</script>
