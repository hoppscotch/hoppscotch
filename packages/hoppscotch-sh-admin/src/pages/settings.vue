<template>
  <div class="flex flex-col">
    <h1 class="text-lg font-bold text-secondaryDark">
      {{ t('settings.settings') }}
    </h1>
  </div>

  <div
    v-if="fetchingInfraConfigs || fetchingAllowedAuthProviders"
    class="flex justify-center"
  >
    <HoppSmartSpinner />
  </div>

  <div v-else-if="infraConfigsError || allowedAuthProvidersError">Error</div>

  <div class="flex flex-col">
    <div class="py-8">
      <HoppSmartTabs v-model="selectedOptionTab" render-inactive-tabs>
        <HoppSmartTab :id="'config'" label="Config">
          <SettingsConfig v-model:config="workingConfigs" class="py-8 px-4" />
        </HoppSmartTab>
      </HoppSmartTabs>
    </div>
  </div>

  <div v-if="diff" class="fixed bottom-0 right-0 m-10">
    <HoppButtonPrimary label="Save Changes" @click="changes = !changes" />
  </div>

  <SettingsRestartServer v-if="restart" :workingConfigs="workingConfigs" />

  <HoppSmartConfirmModal
    :show="changes"
    title="Confirm Changes?"
    @hide-modal="changes = false"
    @resolve="restart = true"
  />
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from '~/composables/i18n';
import { useConfigHandler } from '~/composables/useConfigHandler';
import { isEqual } from 'lodash-es';

const t = useI18n();

const changes = ref(false);
const restart = ref(false);

type OptionTabs = 'config';
const selectedOptionTab = ref<OptionTabs>('config');

const {
  currentConfigs,
  workingConfigs,
  fetchingInfraConfigs,
  infraConfigsError,
  fetchingAllowedAuthProviders,
  allowedAuthProvidersError,
} = useConfigHandler();

const diff = computed(() => {
  if (currentConfigs.value && workingConfigs.value) {
    return !isEqual(currentConfigs.value, workingConfigs.value);
  } else {
    return true;
  }
});
</script>
