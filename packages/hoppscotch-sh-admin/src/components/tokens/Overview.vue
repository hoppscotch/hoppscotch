<template>
  <div class="px-4 py-6 space-y-4 flex flex-col items-start">
    <div class="space-y-1">
      <h4 class="font-bold text-secondaryDark heading mt-2">
        {{ t('infra_tokens.section_title') }}
      </h4>

      <p class="text-secondaryLight">
        {{ t('infra_tokens.section_description') }}
      </p>
    </div>

    <HoppButtonSecondary
      filled
      outline
      :label="t('infra_tokens.generate_new_token')"
      @click="emit('show-infra-tokens-generate-modal')"
    />
  </div>
</template>

<script setup lang="ts">
import { useI18n } from '~/composables/i18n';

const t = useI18n();

const emit = defineEmits<{
  (e: 'show-infra-tokens-generate-modal'): void;
}>();
</script>
