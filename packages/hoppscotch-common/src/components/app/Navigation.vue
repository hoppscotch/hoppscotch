<template>
  <div class="flex items-center justify-between">
    <HoppButtonSecondary
      v-tippy="{ theme: 'tooltip', delay: [500, 20], allowHTML: true }"
      :title="`${t(
        'action.go_back'
      )} <kbd>${getSpecialKey()}</kbd><kbd>←</kbd>`"
      :icon="IconArrowLeft"
      class="rounded hover:bg-primaryDark focus-visible:bg-primaryDark"
      @click="router.go(-1)"
    />
    <HoppButtonSecondary
      v-tippy="{ theme: 'tooltip', delay: [500, 20], allowHTML: true }"
      :title="`${t(
        'action.go_forward'
      )} <kbd>${getSpecialKey()}</kbd><kbd>→</kbd>`"
      :icon="IconArrowRight"
      class="rounded hover:bg-primaryDark focus-visible:bg-primaryDark"
      @click="router.go(1)"
    />
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "@composables/i18n"
import { useRouter } from "vue-router"
import { getPlatformSpecialKey as getSpecialKey } from "~/helpers/platformutils"
import IconArrowLeft from "~icons/lucide/arrow-left"
import IconArrowRight from "~icons/lucide/arrow-right"

const t = useI18n()
const router = useRouter()
</script>
