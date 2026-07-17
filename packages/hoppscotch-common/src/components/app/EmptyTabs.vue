<template>
  <div
    class="flex min-h-[24rem] flex-1 flex-col items-center justify-center px-6 py-12 text-center"
  >
    <AppLogo class="h-20 w-20 opacity-10 grayscale" aria-hidden="true" />
    <h2 class="mt-6 text-lg font-semibold text-secondaryDark">
      {{ t("empty.start_request") }}
    </h2>
    <p class="mt-2 max-w-sm text-sm text-secondary">
      {{ t("empty.start_request_description") }}
    </p>
    <div class="mt-6 flex flex-wrap items-center justify-center gap-2">
      <HoppButtonPrimary
        :label="t('request.new')"
        filled
        @click="emit('new-request')"
      />
      <HoppButtonSecondary
        :label="t('import.collections')"
        outline
        @click="emit('import-collection')"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "~/composables/i18n"
import AppLogo from "./Logo.vue"

const t = useI18n()

const emit = defineEmits<{
  (event: "new-request"): void
  (event: "import-collection"): void
}>()
</script>
