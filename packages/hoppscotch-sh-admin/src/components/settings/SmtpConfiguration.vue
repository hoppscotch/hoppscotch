<template>
  <div v-if="smtpConfigs" class="grid md:grid-cols-3 gap-4 md:gap-4 pt-8">
    <div class="md:col-span-1">
      <h3 class="heading">{{ t('configs.mail_configs.title') }}</h3>
      <p class="my-1 text-secondaryLight">
        {{ t('configs.mail_configs.description') }}
      </p>
    </div>

    <div class="space-y-8 sm:px-8 md:col-span-2">
      <section>
        <h4 class="font-semibold text-secondaryDark">
          {{ t('configs.mail_configs.title') }}
        </h4>

        <div class="space-y-4 py-4">
          <div class="flex items-center">
            <div class="flex justify-between w-full">
              <HoppSmartToggle
                :on="smtpConfigs.enabled"
                @change="smtpConfigs.enabled = !smtpConfigs.enabled"
              >
                {{ t('configs.mail_configs.enable_smtp') }}
              </HoppSmartToggle>
              <HoppButtonSecondary
                blank
                v-tippy="{ theme: 'tooltip', allowHTML: true }"
                to="https://docs.hoppscotch.io/documentation/self-host/community-edition/prerequisites#email-delivery"
                :title="t('support.documentation')"
                :icon="IconHelpCircle"
                class="rounded hover:bg-primaryDark focus-visible:bg-primaryDark"
              />
            </div>
          </div>

          <div v-if="smtpConfigs.enabled" class="ml-12">
            <div class="flex flex-col items-start gap-5">
              <HoppSmartCheckbox
                :on="smtpConfigs.fields.mailer_use_custom_configs"
                :title="t('configs.mail_configs.custom_smtp_configs')"
                @change="
                  smtpConfigs.fields.mailer_use_custom_configs =
                    !smtpConfigs.fields.mailer_use_custom_configs
                "
              >
                {{ t('configs.mail_configs.custom_smtp_configs') }}
              </HoppSmartCheckbox>
            </div>

            <!-- SMTP URL -->
            <template v-if="!smtpConfigs.fields.mailer_use_custom_configs">
              <div
                v-for="field in basicFields"
                :key="field.key"
                class="mt-5 ml-12"
              >
                <label>{{ field.name }}</label>
                <span class="flex max-w-lg">
                  <HoppSmartInput
                    v-model="stringFields[field.key]"
                    :type="isMasked(field.key) ? 'password' : 'text'"
                    :autofocus="false"
                    class="!my-2 !bg-primaryLight flex-1 border border-divider rounded"
                    input-styles="!border-0"
                  >
                    <template #button>
                      <HoppButtonSecondary
                        :icon="isMasked(field.key) ? IconEye : IconEyeOff"
                        class="bg-primaryLight rounded"
                        @click="toggleMask(field.key)"
                      />
                    </template>
                  </HoppSmartInput>
                </span>
                <div
                  v-if="getFieldError(field.key)"
                  class="flex items-center justify-between bg-red-200 px-2 py-2 font-semibold text-red-700 rounded-lg mt-2 max-w-lg"
                >
                  <div class="flex items-center">
                    <icon-lucide-info class="mr-2" />
                    <span>{{ field.error }}</span>
                  </div>
                </div>
              </div>
            </template>

            <!-- CUSTOM MODE -->
            <template v-if="smtpConfigs.fields.mailer_use_custom_configs">
              <!-- Host & Port -->
              <div
                v-for="field in connectionFields"
                :key="field.key"
                class="mt-5 ml-12"
              >
                <label>{{ field.name }}</label>
                <span class="flex max-w-lg">
                  <HoppSmartInput
                    v-model="stringFields[field.key]"
                    :type="isMasked(field.key) ? 'password' : 'text'"
                    :autofocus="false"
                    class="!my-2 !bg-primaryLight flex-1 border border-divider rounded"
                    input-styles="!border-0"
                  >
                    <template #button>
                      <HoppButtonSecondary
                        :icon="isMasked(field.key) ? IconEye : IconEyeOff"
                        class="bg-primaryLight rounded"
                        @click="toggleMask(field.key)"
                      />
                    </template>
                  </HoppSmartInput>
                </span>
              </div>
            </template>

            <!-- From Address (always visible) -->
            <div class="mt-5 ml-12">
              <label>{{ t('configs.mail_configs.address_from') }}</label>
              <span class="flex max-w-lg">
                <HoppSmartInput
                  v-model="smtpConfigs.fields.mailer_from_address"
                  :type="isMasked('mailer_from_address') ? 'password' : 'text'"
                  :autofocus="false"
                  class="!my-2 !bg-primaryLight flex-1 border border-divider rounded"
                  input-styles="!border-0"
                >
                  <template #button>
                    <HoppButtonSecondary
                      :icon="
                        isMasked('mailer_from_address') ? IconEye : IconEyeOff
                      "
                      class="bg-primaryLight rounded"
                      @click="toggleMask('mailer_from_address')"
                    />
                  </template>
                </HoppSmartInput>
              </span>
            </div>

            <!-- Custom mode: Auth & Security -->
            <template v-if="smtpConfigs.fields.mailer_use_custom_configs">
              <!-- Auth Type Tabs + Auth Credentials -->
              <div class="mt-5 ml-12 max-w-lg">
                <HoppSmartTabs v-model="authType" render-inactive-tabs>
                  <HoppSmartTab
                    id="login"
                    :icon="IconLock"
                    :label="t('configs.mail_configs.auth_type_login')"
                  >
                    <div class="space-y-1 pt-4">
                      <div v-for="field in loginAuthFields" :key="field.key">
                        <label>{{ field.name }}</label>
                        <span class="flex">
                          <HoppSmartInput
                            v-model="stringFields[field.key]"
                            :type="isMasked(field.key) ? 'password' : 'text'"
                            :autofocus="false"
                            class="!my-2 !bg-primaryLight flex-1 border border-divider rounded"
                            input-styles="!border-0"
                          >
                            <template #button>
                              <HoppButtonSecondary
                                :icon="
                                  isMasked(field.key) ? IconEye : IconEyeOff
                                "
                                class="bg-primaryLight rounded"
                                @click="toggleMask(field.key)"
                              />
                            </template>
                          </HoppSmartInput>
                        </span>
                      </div>
                    </div>
                  </HoppSmartTab>

                  <HoppSmartTab
                    id="oauth2"
                    :icon="IconShield"
                    :label="t('configs.mail_configs.auth_type_oauth2')"
                  >
                    <div class="space-y-1 pt-4">
                      <div v-for="field in oauth2Fields" :key="field.key">
                        <label>{{ field.name }}</label>
                        <span class="flex">
                          <HoppSmartInput
                            v-model="stringFields[field.key]"
                            :type="isMasked(field.key) ? 'password' : 'text'"
                            :autofocus="false"
                            class="!my-2 !bg-primaryLight flex-1 border border-divider rounded"
                            input-styles="!border-0"
                          >
                            <template #button>
                              <HoppButtonSecondary
                                :icon="
                                  isMasked(field.key) ? IconEye : IconEyeOff
                                "
                                class="bg-primaryLight rounded"
                                @click="toggleMask(field.key)"
                              />
                            </template>
                          </HoppSmartInput>
                        </span>
                      </div>
                    </div>
                  </HoppSmartTab>
                </HoppSmartTabs>
              </div>

              <!-- TLS checkboxes -->
              <div
                v-for="field in securityFields"
                :key="field.key"
                class="mt-5 ml-12 flex flex-col items-start gap-5"
              >
                <HoppSmartCheckbox
                  :on="Boolean(smtpConfigs.fields[field.key])"
                  @change="toggleCheckbox(field)"
                >
                  {{ field.name }}
                </HoppSmartCheckbox>
              </div>
            </template>
          </div>
        </div>
      </section>
    </div>

    <HoppSmartConfirmModal
      :show="showAuthSwitchModal"
      :title="t('configs.mail_configs.auth_switch_description')"
      @hide-modal="cancelAuthSwitch"
      @resolve="confirmAuthSwitch"
    />
  </div>
</template>

<script setup lang="ts">
import { useVModel } from '@vueuse/core';
import { computed, reactive, watch } from 'vue';
import { useI18n } from '~/composables/i18n';
import { useSmtpAuthTypeSwitch } from '~/composables/useSmtpAuthTypeSwitch';
import { hasInputValidationFailed, ServerConfigs } from '~/helpers/configs';
import IconEye from '~icons/lucide/eye';
import IconEyeOff from '~icons/lucide/eye-off';
import IconHelpCircle from '~icons/lucide/help-circle';
import IconLock from '~icons/lucide/lock';
import IconShield from '~icons/lucide/shield';

const t = useI18n();

const props = defineProps<{
  config: ServerConfigs;
}>();

const emit = defineEmits<{
  (e: 'update:config', v: ServerConfigs): void;
}>();

const workingConfigs = useVModel(props, 'config', emit);

const smtpConfigs = computed({
  get() {
    return workingConfigs.value?.mailConfigs;
  },
  set(value) {
    workingConfigs.value.mailConfigs = value;
  },
});

type MailFields = ServerConfigs['mailConfigs']['fields'];

// Extract only the keys whose value type is `string`
type StringFieldKey = {
  [K in keyof MailFields]: MailFields[K] extends string ? K : never;
}[keyof MailFields];

type BooleanFieldKey = {
  [K in keyof MailFields]: MailFields[K] extends boolean ? K : never;
}[keyof MailFields];

type Field = {
  name: string;
  key: StringFieldKey;
  error?: string;
};

type CheckboxField = {
  name: string;
  key: BooleanFieldKey;
};

// A typed view of `fields` that only exposes string-valued keys,
// so that `v-model="stringFields[field.key]"` resolves to `string`.
const stringFields = computed(
  () => smtpConfigs.value.fields as Pick<MailFields, StringFieldKey>,
);

// Basic mode: just the SMTP URL
const basicFields: Field[] = [
  {
    name: t('configs.mail_configs.smtp_url'),
    key: 'mailer_smtp_url',
    error: t('configs.mail_configs.input_validation'),
  },
];

// Connection
const connectionFields: Field[] = [
  { name: t('configs.mail_configs.host'), key: 'mailer_smtp_host' },
  { name: t('configs.mail_configs.port'), key: 'mailer_smtp_port' },
];

// Login auth credentials
const loginAuthFields: Field[] = [
  { name: t('configs.mail_configs.user'), key: 'mailer_smtp_user' },
  { name: t('configs.mail_configs.password'), key: 'mailer_smtp_password' },
];

// OAuth2 auth credentials
const oauth2Fields: Field[] = [
  {
    name: t('configs.mail_configs.oauth2_user'),
    key: 'mailer_smtp_oauth2_user',
  },
  {
    name: t('configs.mail_configs.oauth2_client_id'),
    key: 'mailer_smtp_oauth2_client_id',
  },
  {
    name: t('configs.mail_configs.oauth2_client_secret'),
    key: 'mailer_smtp_oauth2_client_secret',
  },
  {
    name: t('configs.mail_configs.oauth2_refresh_token'),
    key: 'mailer_smtp_oauth2_refresh_token',
  },
  {
    name: t('configs.mail_configs.oauth2_access_url'),
    key: 'mailer_smtp_oauth2_access_url',
  },
];

// Security checkboxes
const securityFields: CheckboxField[] = [
  { name: t('configs.mail_configs.secure'), key: 'mailer_smtp_secure' },
  {
    name: t('configs.mail_configs.ignore_tls'),
    key: 'mailer_smtp_ignore_tls',
  },
  {
    name: t('configs.mail_configs.tls_reject_unauthorized'),
    key: 'mailer_tls_reject_unauthorized',
  },
];

const maskState = reactive<Record<string, boolean>>({
  mailer_smtp_url: true,
  mailer_from_address: true,
  mailer_smtp_host: true,
  mailer_smtp_port: true,
  mailer_smtp_user: true,
  mailer_smtp_password: true,
  mailer_smtp_oauth2_user: true,
  mailer_smtp_oauth2_client_id: true,
  mailer_smtp_oauth2_client_secret: true,
  mailer_smtp_oauth2_refresh_token: true,
  mailer_smtp_oauth2_access_url: true,
});

const toggleMask = (fieldKey: keyof ServerConfigs['mailConfigs']['fields']) => {
  maskState[fieldKey] = !maskState[fieldKey];
};

const isMasked = (fieldKey: keyof ServerConfigs['mailConfigs']['fields']) =>
  maskState[fieldKey];

const toggleCheckbox = (field: CheckboxField) =>
  (smtpConfigs.value.fields[field.key] = !smtpConfigs.value.fields[field.key]);

// Input Validation
const fieldErrors = computed(() => {
  const errors: Record<string, boolean> = {};

  if (smtpConfigs.value?.fields.mailer_smtp_url) {
    const value = smtpConfigs.value.fields.mailer_smtp_url;
    errors.mailer_smtp_url =
      !value.startsWith('smtp://') && !value.startsWith('smtps://');
  }

  return errors;
});

const getFieldError = (fieldKey: StringFieldKey) => fieldErrors.value[fieldKey];

watch(fieldErrors, (errors) => {
  hasInputValidationFailed.value = Object.values(errors).some(Boolean);
});

const LOGIN_KEYS: StringFieldKey[] = [
  'mailer_smtp_user',
  'mailer_smtp_password',
];
const OAUTH2_KEYS: StringFieldKey[] = [
  'mailer_smtp_oauth2_user',
  'mailer_smtp_oauth2_client_id',
  'mailer_smtp_oauth2_client_secret',
  'mailer_smtp_oauth2_refresh_token',
  'mailer_smtp_oauth2_access_url',
];

const { authType, showAuthSwitchModal, confirmAuthSwitch, cancelAuthSwitch } =
  useSmtpAuthTypeSwitch<StringFieldKey>(
    () => stringFields.value,
    'mailer_smtp_auth_type',
    LOGIN_KEYS,
    OAUTH2_KEYS,
  );
</script>
