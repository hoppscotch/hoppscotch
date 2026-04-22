<template>
  <div class="my-2">
    <!-- SMTP URL -->
    <div class="flex flex-col space-y-2">
      <div class="py-2 mb-4">
        <!-- Custom Configs -->
        <HoppSmartCheckbox
          :on="smtp.USE_CUSTOM_CONFIGS.enabled"
          @change="toggleConfig('USE_CUSTOM_CONFIGS')"
        >
          {{ smtp.USE_CUSTOM_CONFIGS.text }}
        </HoppSmartCheckbox>
        <p class="text-secondaryLight text-tiny mt-2">
          {{ t('onboarding.smtp_advanced_config_enable') }}
        </p>
      </div>
      <HoppSmartInput
        v-if="smtp.SMTP_URL.enabled"
        v-model="currentConfigs.mailerConfigs[smtp.SMTP_URL.id]"
        :label="smtp.SMTP_URL.text"
        :autofocus="false"
        input-styles="floating-input"
        class="!my-2 !bg-primaryLight flex-1"
      />
    </div>

    <!-- Host & Port -->
    <div v-if="smtp.USE_CUSTOM_CONFIGS.enabled" class="flex flex-col space-y-2">
      <HoppSmartInput
        v-for="key in connectionKeys"
        :key="key"
        v-model="currentConfigs.mailerConfigs[smtp[key].id]"
        :label="smtp[key].text"
        input-styles="floating-input"
        class="!my-2 !bg-primaryLight flex-1"
      />
    </div>

    <!-- From Address (always visible) -->
    <HoppSmartInput
      v-model="currentConfigs.mailerConfigs[smtp.ADDRESS_FROM.id]"
      :label="smtp.ADDRESS_FROM.text"
      :autofocus="false"
      input-styles="floating-input"
      class="!my-2 !bg-primaryLight flex-1"
    />

    <!-- Auth & Security -->
    <div v-if="smtp.USE_CUSTOM_CONFIGS.enabled" class="flex flex-col space-y-2">
      <!-- Auth Type Tabs + Auth Credentials -->
      <HoppSmartTabs v-model="authType" render-inactive-tabs>
        <HoppSmartTab
          id="login"
          :icon="IconLock"
          :label="t('configs.mail_configs.auth_type_login')"
        >
          <div class="flex flex-col space-y-2 pt-4">
            <HoppSmartInput
              v-for="key in loginAuthKeys"
              :key="key"
              v-model="currentConfigs.mailerConfigs[smtp[key].id]"
              :label="smtp[key].text"
              input-styles="floating-input"
              :type="key === 'SMTP_PASSWORD' ? 'password' : 'text'"
              class="!my-2 !bg-primaryLight flex-1"
            />
          </div>
        </HoppSmartTab>

        <HoppSmartTab
          id="oauth2"
          :icon="IconShield"
          :label="t('configs.mail_configs.auth_type_oauth2')"
        >
          <div class="flex flex-col space-y-2 pt-4">
            <HoppSmartInput
              v-for="key in oauth2Keys"
              :key="key"
              v-model="currentConfigs.mailerConfigs[smtp[key].id]"
              :label="smtp[key].text"
              input-styles="floating-input"
              :type="isOAuth2SecretField(key) ? 'password' : 'text'"
              class="!my-2 !bg-primaryLight flex-1"
            />
          </div>
        </HoppSmartTab>
      </HoppSmartTabs>

      <!-- TLS checkboxes -->
      <div class="flex items-center space-x-2">
        <HoppSmartCheckbox
          :on="smtp.SMTP_SECURE.enabled"
          @change="toggleConfig('SMTP_SECURE')"
        >
          {{ smtp.SMTP_SECURE.text }}
        </HoppSmartCheckbox>

        <HoppSmartCheckbox
          :on="smtp.SMTP_IGNORE_TLS.enabled"
          @change="toggleConfig('SMTP_IGNORE_TLS')"
        >
          {{ smtp.SMTP_IGNORE_TLS.text }}
        </HoppSmartCheckbox>

        <HoppSmartCheckbox
          :on="smtp.TLS_REJECT_UNAUTHORIZED.enabled"
          @change="toggleConfig('TLS_REJECT_UNAUTHORIZED')"
        >
          {{ smtp.TLS_REJECT_UNAUTHORIZED.text }}
        </HoppSmartCheckbox>
      </div>
    </div>

    <HoppSmartConfirmModal
      :show="showAuthSwitchModal"
      :title="t('configs.mail_configs.auth_switch_description')"
      @hide-modal="cancelAuthSwitch"
      @resolve="confirmAuthSwitch"
    />
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import { useVModel } from '@vueuse/core';
import {
  Configs,
  EnabledConfig,
  MailerConfigKeys,
} from '~/composables/useOnboardingConfigHandler';
import { useSmtpAuthTypeSwitch } from '~/composables/useSmtpAuthTypeSwitch';
import { useI18n } from '~/composables/i18n';
import IconLock from '~icons/lucide/lock';
import IconShield from '~icons/lucide/shield';

const t = useI18n();

const props = defineProps<{
  currentConfigs: Configs;
  enabledConfigs: EnabledConfig[];
}>();

const currentConfigs = useVModel(props, 'currentConfigs');

type ConfigKey = keyof Configs['mailerConfigs'];
type ConfigField = {
  id: ConfigKey;
  text: string;
  value: string;
  enabled: boolean;
};

type AllMailerConfigKeys = Exclude<MailerConfigKeys, 'SMTP_ENABLE'>;

type MailerConfig = Record<AllMailerConfigKeys, ConfigField>;

const smtp = computed<MailerConfig>(() => {
  const cfg = currentConfigs.value.mailerConfigs;
  const isCustom = cfg.MAILER_USE_CUSTOM_CONFIGS === 'true';

  return {
    SMTP_URL: {
      id: 'MAILER_SMTP_URL',
      text: t('configs.mail_configs.smtp_url'),
      value: cfg.MAILER_SMTP_URL,
      enabled: !isCustom,
    },
    ADDRESS_FROM: {
      id: 'MAILER_ADDRESS_FROM',
      text: t('configs.mail_configs.address_from'),
      value: cfg.MAILER_ADDRESS_FROM,
      enabled: true,
    },
    USE_CUSTOM_CONFIGS: {
      id: 'MAILER_USE_CUSTOM_CONFIGS',
      text: t('configs.mail_configs.custom_smtp_configs'),
      value: cfg.MAILER_USE_CUSTOM_CONFIGS,
      enabled: isCustom,
    },
    SMTP_HOST: {
      id: 'MAILER_SMTP_HOST',
      text: t('configs.mail_configs.host'),
      value: cfg.MAILER_SMTP_HOST,
      enabled: isCustom,
    },
    SMTP_PORT: {
      id: 'MAILER_SMTP_PORT',
      text: t('configs.mail_configs.port'),
      value: cfg.MAILER_SMTP_PORT,
      enabled: isCustom,
    },
    SMTP_SECURE: {
      id: 'MAILER_SMTP_SECURE',
      text: t('configs.mail_configs.secure'),
      value: cfg.MAILER_SMTP_SECURE,
      enabled: isCustom && cfg.MAILER_SMTP_SECURE === 'true',
    },
    SMTP_IGNORE_TLS: {
      id: 'MAILER_SMTP_IGNORE_TLS',
      text: t('configs.mail_configs.ignore_tls'),
      value: cfg.MAILER_SMTP_IGNORE_TLS,
      enabled: isCustom && cfg.MAILER_SMTP_IGNORE_TLS === 'true',
    },
    TLS_REJECT_UNAUTHORIZED: {
      id: 'MAILER_TLS_REJECT_UNAUTHORIZED',
      text: t('configs.mail_configs.tls_reject_unauthorized'),
      value: cfg.MAILER_TLS_REJECT_UNAUTHORIZED,
      enabled: isCustom && cfg.MAILER_TLS_REJECT_UNAUTHORIZED === 'true',
    },
    SMTP_USER: {
      id: 'MAILER_SMTP_USER',
      text: t('configs.mail_configs.user'),
      value: cfg.MAILER_SMTP_USER,
      enabled: isCustom,
    },
    SMTP_PASSWORD: {
      id: 'MAILER_SMTP_PASSWORD',
      text: t('configs.mail_configs.password'),
      value: cfg.MAILER_SMTP_PASSWORD,
      enabled: isCustom,
    },
    SMTP_AUTH_TYPE: {
      id: 'MAILER_SMTP_AUTH_TYPE',
      text: t('configs.mail_configs.auth_type'),
      value: cfg.MAILER_SMTP_AUTH_TYPE,
      enabled: isCustom,
    },
    SMTP_OAUTH2_USER: {
      id: 'MAILER_SMTP_OAUTH2_USER',
      text: t('configs.mail_configs.oauth2_user'),
      value: cfg.MAILER_SMTP_OAUTH2_USER,
      enabled: isCustom && cfg.MAILER_SMTP_AUTH_TYPE === 'oauth2',
    },
    SMTP_OAUTH2_CLIENT_ID: {
      id: 'MAILER_SMTP_OAUTH2_CLIENT_ID',
      text: t('configs.mail_configs.oauth2_client_id'),
      value: cfg.MAILER_SMTP_OAUTH2_CLIENT_ID,
      enabled: isCustom && cfg.MAILER_SMTP_AUTH_TYPE === 'oauth2',
    },
    SMTP_OAUTH2_CLIENT_SECRET: {
      id: 'MAILER_SMTP_OAUTH2_CLIENT_SECRET',
      text: t('configs.mail_configs.oauth2_client_secret'),
      value: cfg.MAILER_SMTP_OAUTH2_CLIENT_SECRET,
      enabled: isCustom && cfg.MAILER_SMTP_AUTH_TYPE === 'oauth2',
    },
    SMTP_OAUTH2_REFRESH_TOKEN: {
      id: 'MAILER_SMTP_OAUTH2_REFRESH_TOKEN',
      text: t('configs.mail_configs.oauth2_refresh_token'),
      value: cfg.MAILER_SMTP_OAUTH2_REFRESH_TOKEN,
      enabled: isCustom && cfg.MAILER_SMTP_AUTH_TYPE === 'oauth2',
    },
    SMTP_OAUTH2_ACCESS_URL: {
      id: 'MAILER_SMTP_OAUTH2_ACCESS_URL',
      text: t('configs.mail_configs.oauth2_access_url'),
      value: cfg.MAILER_SMTP_OAUTH2_ACCESS_URL,
      enabled: isCustom && cfg.MAILER_SMTP_AUTH_TYPE === 'oauth2',
    },
  };
});

// Field key groups in logical UX order
const connectionKeys: AllMailerConfigKeys[] = ['SMTP_HOST', 'SMTP_PORT'];
const loginAuthKeys: AllMailerConfigKeys[] = ['SMTP_USER', 'SMTP_PASSWORD'];
const oauth2Keys: AllMailerConfigKeys[] = [
  'SMTP_OAUTH2_USER',
  'SMTP_OAUTH2_CLIENT_ID',
  'SMTP_OAUTH2_CLIENT_SECRET',
  'SMTP_OAUTH2_REFRESH_TOKEN',
  'SMTP_OAUTH2_ACCESS_URL',
];

const isOAuth2SecretField = (key: AllMailerConfigKeys) =>
  ['SMTP_OAUTH2_CLIENT_SECRET', 'SMTP_OAUTH2_REFRESH_TOKEN'].includes(key);

const toggleConfig = (key: AllMailerConfigKeys) => {
  const id = smtp.value[key].id;
  const current = currentConfigs.value.mailerConfigs[id];
  currentConfigs.value.mailerConfigs[id] =
    current === 'true' ? 'false' : 'true';
};

const LOGIN_KEYS: ConfigKey[] = ['MAILER_SMTP_USER', 'MAILER_SMTP_PASSWORD'];
const OAUTH2_KEYS: ConfigKey[] = [
  'MAILER_SMTP_OAUTH2_USER',
  'MAILER_SMTP_OAUTH2_CLIENT_ID',
  'MAILER_SMTP_OAUTH2_CLIENT_SECRET',
  'MAILER_SMTP_OAUTH2_REFRESH_TOKEN',
  'MAILER_SMTP_OAUTH2_ACCESS_URL',
];

const { authType, showAuthSwitchModal, confirmAuthSwitch, cancelAuthSwitch } =
  useSmtpAuthTypeSwitch<ConfigKey>(
    () => currentConfigs.value.mailerConfigs,
    'MAILER_SMTP_AUTH_TYPE',
    LOGIN_KEYS,
    OAUTH2_KEYS,
  );
</script>
