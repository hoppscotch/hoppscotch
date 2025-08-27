<template>
  <div class="flex flex-1 justify-center items-center">
    <div class="max-w-screen-md mx-auto p-8 flex flex-col space-y-4">
      <div class="flex flex-col space-y-2 mb-4">
        <img src="/logo.svg" alt="hoppscotch-logo" class="w-20 mb-4" />
        <h1 class="text-3xl font-bold text-secondaryDark">
          {{ t('onboarding.welcome') }}
        </h1>
        <h2 class="mt-3">
          {{ t('onboarding.welcome_screen_description') }}
        </h2>
        <p class="text-secondaryLight">
          {{ t('onboarding.welcome_screen_sub_description') }}
        </p>
      </div>
      <HoppButtonPrimary
        :label="t('onboarding.start_onboarding')"
        @click="$emit('next')"
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { useI18n } from '~/composables/i18n';

const t = useI18n();
</script>
