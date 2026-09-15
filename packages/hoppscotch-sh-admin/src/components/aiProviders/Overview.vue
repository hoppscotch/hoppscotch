<template>
  <div class="px-4 py-6 space-y-4 flex flex-col items-start">
    <div class="space-y-1">
      <h4 class="font-bold text-secondaryDark heading mt-2">
        {{ t('ai_providers.section_title') }}
      </h4>

      <p class="text-secondaryLight">
        {{ t('ai_providers.section_description') }}
      </p>
    </div>

    <HoppButtonSecondary
      filled
      outline
      :label="t('ai_providers.add_connection')"
      @click="emit('show-ai-provider-modal')"
    />
  </div>
</template>

<script setup lang="ts">
import { useI18n } from '~/composables/i18n';

const t = useI18n();

const emit = defineEmits<{
  (e: 'show-ai-provider-modal'): void;
}>();
</script>
