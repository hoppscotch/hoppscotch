<template>
  <div class="flex flex-col items-center p-4 border rounded border-dividerDark">
    <img :src="img" :alt="t('shared_requests.run_in_hoppscotch')" />
  </div>
</template>

<script lang="ts" setup>
import { useI18n } from "~/composables/i18n"

defineProps<{
  img: string
}>()

const t = useI18n()
</script>
