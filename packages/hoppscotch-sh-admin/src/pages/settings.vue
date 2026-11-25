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
      <HoppSmartTab
        id="auth"
        :label="t('configs.tabs.auth')"
        :indicator="tabHasError('auth')"
        indicator-variant="error"
      >
        <SettingsAuthConfigurations v-model:config="workingConfigs" />
      </HoppSmartTab>

      <HoppSmartTab
        id="smtp"
        :label="t('configs.tabs.smtp')"
        :indicator="tabHasError('smtp')"
        indicator-variant="error"
      >
        <div class="pb-8 px-4 flex flex-col space-y-8 divide-y divide-divider">
          <SettingsSmtpConfiguration v-model:config="workingConfigs" />
        </div>
      </HoppSmartTab>

      <HoppSmartTab :id="'token'" :label="t('configs.tabs.infra_tokens')">
        <Tokens />
      </HoppSmartTab>
      <HoppSmartTab
        id="proxy"
        :label="t('configs.tabs.proxy')"
        :indicator="tabHasError('proxy')"
        indicator-variant="error"
      >
        <SettingsProxyURLConfiguration
          class="pb-8 px-4"
          v-model:config="workingConfigs"
        />
      </HoppSmartTab>
      <HoppSmartTab
        :id="'rate-limit'"
        :label="t('configs.tabs.rate_limit')"
        :indicator="tabHasError('rate-limit')"
        indicator-variant="error"
      >
        <SettingsRateLimit v-model:config="workingConfigs" />
      </HoppSmartTab>
      <HoppSmartTab id="miscellaneous" :label="t('configs.tabs.miscellaneous')">
        <div class="pb-8 px-4 flex flex-col space-y-8 divide-y divide-divider">
          <SettingsDataSharing v-model:config="workingConfigs" />
          <SettingsReset />
        </div>
      </HoppSmartTab>
      <HoppSmartTab id="mock" :label="t('configs.mock_server.title')">
        <SettingsMockServerConfig v-model:config="workingConfigs" />
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
import { computed, ref, watch } from 'vue';
import { useI18n } from '~/composables/i18n';
import { useToast } from '~/composables/toast';
import { useConfigHandler } from '~/composables/useConfigHandler';
import {
  ConfigTab,
  getConfigValidationIssues,
  hasGuardIssue,
  provideConfigValidation,
  tabHasConfigIssue,
} from '~/helpers/configs';

const t = useI18n();
const toast = useToast();

// Fresh validation context per mount; children inject for field-level borders.
const { configEdited, configValidationIssues } = provideConfigValidation();

const showSaveChangesModal = ref(false);
const initiateServerRestart = ref(false);

// Tabs
type OptionTabs =
  | 'auth'
  | 'smtp'
  | 'token'
  | 'proxy'
  | 'miscellaneous'
  | 'rate-limit'
  | 'mock';

const selectedOptionTab = ref<OptionTabs>('auth');

// Obtain the current and working configs from the useConfigHandler composable
const {
  currentConfigs,
  workingConfigs,
  fetchingInfraConfigs,
  infraConfigsError,
  fetchingAllowedAuthProviders,
  allowedAuthProvidersError,
} = useConfigHandler();

// Check if the configs have been updated
const isConfigUpdated = computed(() =>
  currentConfigs.value && workingConfigs.value
    ? !isEqual(currentConfigs.value, workingConfigs.value)
    : false,
);

// Gates the field-border surface so borders appear while typing, not on load.
watch(isConfigUpdated, (edited) => (configEdited.value = edited), {
  immediate: true,
});

// Keep the issue list live so borders, tab dots, and guards all see the latest.
watch(
  workingConfigs,
  (configs) => {
    configValidationIssues.value = configs
      ? getConfigValidationIssues(configs)
      : [];
  },
  { deep: true, immediate: true },
);

const blockedByEmptyField = computed(() =>
  hasGuardIssue(configValidationIssues.value, 'required'),
);
const blockedByPartialSmtp = computed(() =>
  hasGuardIssue(configValidationIssues.value, 'smtp-pair'),
);
const blockedByInvalidInput = computed(() =>
  hasGuardIssue(configValidationIssues.value, 'format'),
);

// Proactive — shows even before any edit so hidden blockers stay visible.
const tabHasError = (tab: ConfigTab) =>
  tabHasConfigIssue(configValidationIssues.value, tab);

// Names the offending fields in the console for support cross-reference.
const logConfigValidationIssues = () => {
  const issues = configValidationIssues.value;
  if (!issues.length) return;

  const rows = issues.map((issue) => ({
    tab: issue.subTab ? `${issue.tab} › ${issue.subTab}` : issue.tab,
    field: issue.fieldKey,
    envVar: issue.envVar,
    issue: issue.kind,
  }));

  // eslint-disable-next-line no-console
  console.warn(
    `[Hoppscotch Admin] Save blocked — ${issues.length} configuration field(s) need attention:`,
  );
  // eslint-disable-next-line no-console
  console.table(rows);
};

// Logs diagnostics and surfaces the highest-priority blocking toast, returning
// true when a guard fired (save must halt) and false when every guard passes.
// Shared by the Save click and the post-confirm restart so the modal-confirm
// path enforces the same full guard set as opening the modal — not just the
// empty-field subset.
const surfaceSaveBlockers = (): boolean => {
  const blocked =
    blockedByEmptyField.value ||
    blockedByPartialSmtp.value ||
    blockedByInvalidInput.value;

  if (!blocked) return false;

  logConfigValidationIssues();

  if (blockedByEmptyField.value) {
    toast.error(t('configs.input_empty'));
  } else if (blockedByPartialSmtp.value) {
    toast.error(t('configs.mail_configs.smtp_auth_incomplete'));
  } else if (blockedByInvalidInput.value) {
    toast.error(t('configs.input_validation_error'));
  }

  return true;
};

const triggerSaveChangesModal = () => {
  if (surfaceSaveBlockers()) return;
  showSaveChangesModal.value = true;
};

const restartServer = () => {
  if (surfaceSaveBlockers()) return;
  showSaveChangesModal.value = false;
  initiateServerRestart.value = true;
};
</script>
