<template>
  <div class="flex flex-col items-center space-y-4">
    <IconLucideDownload class="h-16 w-16 text-accent" />
    <div class="text-center">
      <h2 class="text-xl font-semibold text-secondaryDark">Update Available</h2>
      <p class="text-secondary mt-1">
        {{ message || "A new version of Hoppscotch is available" }}
      </p>
    </div>

    <div
      v-if="showProgress && progress && progress.total && progress.downloaded"
      class="w-full"
    >
      <div class="w-full bg-primaryLight rounded-full h-2.5">
        <div
          class="bg-accent h-2.5 rounded-full transition-all duration-300"
          :style="{
            width: `${progress.percentage}%`,
          }"
        ></div>
      </div>
      <div class="flex justify-between text-sm text-secondaryLight mt-1">
        <span>{{ Math.round(progress.percentage) }}%</span>
        <span class="text-sm">
          {{ formatBytes(progress.downloaded) }} /
          {{ formatBytes(progress.total) }}
        </span>
      </div>
    </div>

    <div
      v-else-if="showProgress && progress && progress.downloaded > 0"
      class="w-full"
    >
      <div class="w-full bg-primaryLight rounded-full h-2.5">
        <div
          class="bg-accent h-2.5 rounded-full animate-pulse"
          style="width: 100%"
        ></div>
      </div>
      <p class="text-sm text-secondaryLight text-center mt-1">
        Downloaded {{ formatBytes(progress.downloaded) }}
      </p>
    </div>

    <div class="flex space-x-2">
      <HoppButtonPrimary
        v-if="state === 'available'"
        label="Install Update"
        :icon="IconLucideDownload"
        @click="$emit('install')"
      />
      <HoppButtonPrimary
        v-else-if="state === 'ready'"
        label="Restart Now"
        :icon="IconLucideRefreshCw"
        @click="$emit('restart')"
      />
      <HoppButtonSecondary
        v-if="state === 'available'"
        label="Later"
        outline
        @click="$emit('skip')"
      />
      <HoppButtonSecondary
        v-if="showCancel"
        label="Cancel"
        outline
        @click="$emit('cancel')"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import IconLucideDownload from "~icons/lucide/download"
import IconLucideRefreshCw from "~icons/lucide/refresh-cw"
import type { DownloadProgress } from "~/services/updater.client"

interface Props {
  state: "available" | "downloading" | "installing" | "ready"
  message?: string
  progress?: DownloadProgress
  showProgress?: boolean
  showCancel?: boolean
}

withDefaults(defineProps<Props>(), {
  message: "",
  showProgress: true,
  showCancel: false,
})

defineEmits<{
  install: []
  restart: []
  skip: []
  cancel: []
}>()

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes"

  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
}
</script>
