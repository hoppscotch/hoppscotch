<template>
  <div class="p-4 space-y-4">
    <div class="space-y-1">
      <h4 class="font-semibold text-secondaryDark">
        {{ t("access_tokens.section_title") }}
      </h4>

      <p class="text-secondaryLight">
        {{ t("access_tokens.section_description") }}
      </p>
    </div>

    <HoppButtonSecondary
      filled
      outline
      :label="t('access_tokens.generate_new_token')"
      @click="emit('show-access-tokens-generate-modal')"
    />
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "~/composables/i18n"

const t = useI18n()

const emit = defineEmits<{
  (e: "show-access-tokens-generate-modal"): void
}>()
</script>
