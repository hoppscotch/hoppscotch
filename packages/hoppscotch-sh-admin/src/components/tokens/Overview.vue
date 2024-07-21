<template>
  <div class="px-8 py-6 ml-5 space-y-4">
    <div class="space-y-1">
      <h4 class="font-bold text-secondaryDark heading mt-2">
        {{ t('access_tokens.section_title') }}
      </h4>

      <p class="text-secondaryLight">
        {{ t('access_tokens.section_description') }}
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
import { useI18n } from '~/composables/i18n';

const t = useI18n();

const emit = defineEmits<{
  (e: 'show-access-tokens-generate-modal'): void;
}>();
</script>
