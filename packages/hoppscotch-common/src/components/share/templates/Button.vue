<template>
  <div
    class="border border-dotted border-dividerDark rounded p-5 flex justify-center items-center"
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
