<template>
  <div class="my-4">
    <!-- Basic SMTP Fields -->
    <div class="flex flex-col space-y-2">
      <HoppSmartInput
        v-model="currentConfigs.mailerConfigs[smtp.ADDRESS_FROM.id]"
        :label="smtp.ADDRESS_FROM.text"
        :autofocus="false"
        input-styles="floating-input"
        class="!my-2 !bg-primaryLight flex-1"
      />
      <HoppSmartInput
        v-if="smtp.SMTP_URL.enabled"
        v-model="currentConfigs.mailerConfigs[smtp.SMTP_URL.id]"
        :label="smtp.SMTP_URL.text"
        :autofocus="false"
        input-styles="floating-input"
        class="!my-2 !bg-primaryLight flex-1"
      />
    </div>

    <!-- Custom Config Fields -->
    <div v-if="smtp.USE_CUSTOM_CONFIGS.enabled" class="flex flex-col space-y-2">
      <HoppSmartInput
        v-for="key in ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASSWORD'] as AllMailerConfigKeys[]"
        :key="key"
        v-model="currentConfigs.mailerConfigs[smtp[key].id]"
        :label="smtp[key].text"
        input-styles="floating-input"
        :type="key === 'SMTP_PASSWORD' ? 'password' : 'text'"
        class="!my-2 !bg-primaryLight flex-1"
      />

      <!-- Custom Config Checkboxes -->
      <div class="flex items-center space-x-2">
        <HoppSmartCheckbox
          :on="smtp.SMTP_SECURE.enabled"
          @change="toggleConfig('SMTP_SECURE')"
        >
          {{ smtp.SMTP_SECURE.text }}
        </HoppSmartCheckbox>

        <HoppSmartCheckbox
          :on="smtp.TLS_REJECT_UNAUTHORIZED.enabled"
          @change="toggleConfig('TLS_REJECT_UNAUTHORIZED')"
        >
          {{ smtp.TLS_REJECT_UNAUTHORIZED.text }}
        </HoppSmartCheckbox>
      </div>
    </div>

    <!-- Toggle: Use Custom Configs -->
    <HoppSmartCheckbox
      class="mt-4"
      :on="smtp.USE_CUSTOM_CONFIGS.enabled"
      @change="toggleConfig('USE_CUSTOM_CONFIGS')"
    >
      {{ smtp.USE_CUSTOM_CONFIGS.text }}
    </HoppSmartCheckbox>
    <p class="text-secondaryLight text-tiny mt-2">
      {{ t('onboarding.smtp_advanced_config_enable') }}
    </p>
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
import { useI18n } from '~/composables/i18n';

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
      text: 'SMTP URL',
      value: cfg.MAILER_SMTP_URL,
      enabled: !isCustom,
    },
    ADDRESS_FROM: {
      id: 'MAILER_ADDRESS_FROM',
      text: 'Address From',
      value: cfg.MAILER_ADDRESS_FROM,
      enabled: true,
    },
    USE_CUSTOM_CONFIGS: {
      id: 'MAILER_USE_CUSTOM_CONFIGS',
      text: 'Use Custom Configs',
      value: cfg.MAILER_USE_CUSTOM_CONFIGS,
      enabled: isCustom,
    },
    SMTP_SECURE: {
      id: 'MAILER_SMTP_SECURE',
      text: 'SMTP Secure',
      value: cfg.MAILER_SMTP_SECURE,
      enabled: isCustom && cfg.MAILER_SMTP_SECURE === 'true',
    },
    TLS_REJECT_UNAUTHORIZED: {
      id: 'MAILER_TLS_REJECT_UNAUTHORIZED',
      text: 'TLS Reject Unauthorized',
      value: cfg.MAILER_TLS_REJECT_UNAUTHORIZED,
      enabled: isCustom && cfg.MAILER_TLS_REJECT_UNAUTHORIZED === 'true',
    },
    SMTP_USER: {
      id: 'MAILER_SMTP_USER',
      text: 'SMTP User',
      value: cfg.MAILER_SMTP_USER,
      enabled: isCustom,
    },
    SMTP_PASSWORD: {
      id: 'MAILER_SMTP_PASSWORD',
      text: 'SMTP Password',
      value: cfg.MAILER_SMTP_PASSWORD,
      enabled: isCustom,
    },
    SMTP_HOST: {
      id: 'MAILER_SMTP_HOST',
      text: 'SMTP Host',
      value: cfg.MAILER_SMTP_HOST,
      enabled: isCustom,
    },
    SMTP_PORT: {
      id: 'MAILER_SMTP_PORT',
      text: 'SMTP Port',
      value: cfg.MAILER_SMTP_PORT,
      enabled: isCustom,
    },
  };
});

const toggleConfig = (key: AllMailerConfigKeys) => {
  const id = smtp.value[key].id;
  const current = currentConfigs.value.mailerConfigs[id];
  currentConfigs.value.mailerConfigs[id] =
    current === 'true' ? 'false' : 'true';
};
</script>
