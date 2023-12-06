<template>
  <div class="md:grid md:grid-cols-3 md:gap-4">
    <div class="p-8 md:col-span-1">
      <h3 class="heading">Reset Configurations</h3>
      <p class="my-1 text-secondaryLight">Reset all Configs to default</p>
    </div>
    <div class="space-y-8 p-8 md:col-span-2">
      <section>
        <h4 class="font-semibold text-secondaryDark">
          Resets Configs to default
        </h4>
        <div class="space-y-4 py-4">
          <div>
            <HoppButtonPrimary
              label="Reset Configs"
              class="bg-red-700 hover:bg-red-500"
              @click="resetConfigs"
            />
          </div>
        </div>
      </section>
    </div>
  </div>

  <SettingsRestartServer :show="saveChangesModal" />

  <HoppSmartConfirmModal
    :show="resetModal"
    title="Confirm Reset?"
    @hide-modal="resetModal = false"
    @resolve="saveChangesModal = true"
  />
</template>

<script setup lang="ts">
import { HoppButtonPrimary } from '@hoppscotch/ui';
import { ref } from 'vue';
import { useI18n } from '~/composables/i18n';

const t = useI18n();

const resetModal = ref(false);

const saveChangesModal = ref(false);

const resetConfigs = () => {
  resetModal.value = true;
};
</script>
