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

  <div v-else-if="infraConfigsError || allowedAuthProvidersError">
    {{ t('configs.load_error') }}
  </div>

  <div v-else-if="workingConfigs" class="flex flex-col py-8">
    <HoppSmartTabs v-model="selectedOptionTab" render-inactive-tabs>
      <HoppSmartTab id="auth" :label="t('configs.tabs.auth')">
        <SettingsAuthConfigurations v-model:config="workingConfigs" />
      </HoppSmartTab>

      <HoppSmartTab id="smtp" :label="t('configs.tabs.smtp')">
        <div class="pb-8 px-4 flex flex-col space-y-8 divide-y divide-divider">
          <SettingsSmtpConfiguration v-model:config="workingConfigs" />
        </div>
      </HoppSmartTab>

      <HoppSmartTab :id="'token'" :label="t('configs.tabs.infra_tokens')">
        <Tokens />
      </HoppSmartTab>
      <HoppSmartTab :id="'rate-limit'" :label="t('configs.tabs.rate_limit')">
        <SettingsRateLimit v-model:config="workingConfigs" />
      </HoppSmartTab>
      <HoppSmartTab id="miscellaneous" :label="t('configs.tabs.miscellaneous')">
        <div class="pb-8 px-4 flex flex-col space-y-8 divide-y divide-divider">
          <SettingsDataSharing v-model:config="workingConfigs" />
          <SettingsReset />
        </div>
      </HoppSmartTab>
    </HoppSmartTabs>
  </div>

  <div v-if="isConfigUpdated" class="fixed bottom-0 right-0 m-10">
    <HoppButtonPrimary
      :label="t('configs.save_changes')"
      @click="triggerSaveChangesModal"
    />
  </div>

  <SettingsServerRestart
    v-if="initiateServerRestart"
    :workingConfigs="workingConfigs"
    @mutation-failure="initiateServerRestart = false"
  />

  <HoppSmartConfirmModal
    :show="showSaveChangesModal"
    :title="t('configs.confirm_changes')"
    @hide-modal="showSaveChangesModal = false"
    @resolve="restartServer"
  />
</template>

<script setup lang="ts">
import { isEqual } from 'lodash-es';
import { computed, ref } from 'vue';
import { useI18n } from '~/composables/i18n';
import { useToast } from '~/composables/toast';
import { useConfigHandler } from '~/composables/useConfigHandler';
import { hasInputValidationFailed } from '~/helpers/configs';

const t = useI18n();
const toast = useToast();

const showSaveChangesModal = ref(false);
const initiateServerRestart = ref(false);

// Tabs
type OptionTabs = 'auth' | 'smtp' | 'token' | 'miscellaneous' | 'rate-limit';
const selectedOptionTab = ref<OptionTabs>('auth');

// Obtain the current and working configs from the useConfigHandler composable
const {
  currentConfigs,
  workingConfigs,
  fetchingInfraConfigs,
  infraConfigsError,
  fetchingAllowedAuthProviders,
  allowedAuthProvidersError,
  AreAnyConfigFieldsEmpty,
} = useConfigHandler();

// Check if the configs have been updated
const isConfigUpdated = computed(() =>
  currentConfigs.value && workingConfigs.value
    ? !isEqual(currentConfigs.value, workingConfigs.value)
    : false
);

// Check if any of the fields in workingConfigs are empty
const areAnyFieldsEmpty = computed(() =>
  workingConfigs.value ? AreAnyConfigFieldsEmpty(workingConfigs.value) : false
);

const triggerSaveChangesModal = () => {
  if (areAnyFieldsEmpty.value) {
    return toast.error(t('configs.input_empty'));
  }

  if (hasInputValidationFailed.value) {
    return toast.error(t('configs.input_validation_error'));
  }
  showSaveChangesModal.value = true;
};

const restartServer = () => {
  if (areAnyFieldsEmpty.value) {
    return toast.error(t('configs.input_empty'));
  }
  initiateServerRestart.value = true;
  showSaveChangesModal.value = false;
};
</script>
