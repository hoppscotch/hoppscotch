<template>
  <div
    class="flex items-center justify-center rounded border border-dotted border-dividerDark p-5"
  >
    <a href="/" target="_blank">
      <img :src="img" :alt="t('shared_requests.run_in_hoppscotch')" />
    </a>
  </div>
</template>

<script lang="ts" setup>
import { useI18n } from "~/composables/i18n"

defineProps<{
  img: string
}>()

const t = useI18n()
</script>
