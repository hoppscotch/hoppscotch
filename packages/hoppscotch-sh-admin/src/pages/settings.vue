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
      >
        <SettingsAuthConfigurations v-model:config="workingConfigs" />
      </HoppSmartTab>

      <HoppSmartTab
        id="smtp"
        :label="t('configs.tabs.smtp')"
        :indicator="tabHasError('smtp')"
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
import { computed, onUnmounted, ref, watch } from 'vue';
import { useI18n } from '~/composables/i18n';
import { useToast } from '~/composables/toast';
import { useConfigHandler } from '~/composables/useConfigHandler';
import {
  ConfigTab,
  configEdited,
  configValidationIssues,
  getConfigValidationIssues,
  hasGuardIssue,
  tabHasConfigIssue,
} from '~/helpers/configs';

const t = useI18n();
const toast = useToast();

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

// The shared refs in helpers/configs live at module scope, so reset them
// on unmount — otherwise a quick navigate-away-and-back briefly shows stale
// borders/dots before the immediate watchers above re-fire.
onUnmounted(() => {
  configEdited.value = false;
  configValidationIssues.value = [];
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

const triggerSaveChangesModal = () => {
  if (
    blockedByEmptyField.value ||
    blockedByPartialSmtp.value ||
    blockedByInvalidInput.value
  ) {
    logConfigValidationIssues();
  }

  if (blockedByEmptyField.value) {
    return toast.error(t('configs.input_empty'));
  }

  if (blockedByPartialSmtp.value) {
    return toast.error(t('configs.mail_configs.smtp_auth_incomplete'));
  }

  // Check if any of the input validations have failed
  if (blockedByInvalidInput.value) {
    return toast.error(t('configs.input_validation_error'));
  }
  showSaveChangesModal.value = true;
};

const restartServer = () => {
  if (blockedByEmptyField.value) {
    logConfigValidationIssues();
    return toast.error(t('configs.input_empty'));
  }
  initiateServerRestart.value = true;
  showSaveChangesModal.value = false;
};
</script>

<style scoped>
/* The shared HoppSmartTab indicator dot defaults to the accent color.
   Recolor it to a red error dot in this settings context so a tab with a
   blocking field reads as an error rather than generic "new" activity.

   This depends on @hoppscotch/ui's internal class names for the indicator
   span; if those change in a future upgrade the override silently no-ops
   and the dot falls back to accent (still functional, just not red). */
:deep(.h-1.w-1.rounded-full.bg-accentLight) {
  background-color: rgb(239 68 68);
}
</style>
