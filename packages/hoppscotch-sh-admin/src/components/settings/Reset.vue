<template>
  <div class="grid md:grid-cols-3 gap-8 md:gap-4 pt-8">
    <div class="md:col-span-1">
      <h3 class="heading">{{ t('configs.reset.title') }}</h3>
      <p class="my-1 text-secondaryLight">
        {{ t('configs.reset.description') }}
      </p>
    </div>
    <div class="space-y-8 sm:px-8 md:col-span-2">
      <section>
        <h4 class="font-semibold text-secondaryDark">
          {{ t('configs.reset.info') }}
        </h4>
        <div class="space-y-4 py-4">
          <div>
            <HoppButtonPrimary
              :label="t('configs.reset.title')"
              class="bg-red-700 hover:bg-red-500"
              @click="resetModal = true"
            />
          </div>
        </div>
      </section>
    </div>
  </div>

  <SettingsServerRestart
    v-if="resetInfraConfigs"
    :reset="resetInfraConfigs"
    @mutation-failure="resetInfraConfigs = false"
  />

  <HoppSmartConfirmModal
    :show="resetModal"
    :title="t('configs.reset.confirm_reset')"
    @hide-modal="resetModal = false"
    @resolve="resetInfraConfigs = true"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from '~/composables/i18n';

const t = useI18n();

const resetModal = ref(false);
const resetInfraConfigs = ref(false);
</script>
