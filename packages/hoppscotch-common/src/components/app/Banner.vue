<template>
  <div
    class="relative flex items-center px-4 py-2 transition text-tiny group"
    :class="getBannerColor"
  >
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

const getBannerColor = computed(() => {
  const bgColors: Record<BannerType, string> = {
    error: "bg-red-700",
    warning: "bg-yellow-700",
    info: "bg-error",
  }
  return bgColors[props.banner.type]
})
</script>
