<template>
  <div class="flex flex-col pt-8">
    <div class="px-4 mb-4">
      <h3 class="heading">
        {{ t('configs.auth_providers.auth_provider_config') }}
      </h3>
      <p class="my-1 text-secondaryLight">
        {{ t('configs.auth_providers.auth_provider_description') }}
      </p>
    </div>

    <HoppSmartTabs v-model="selectedAuthSubTab" render-inactive-tabs>
      <HoppSmartTab
        id="auth-providers"
        :label="t('configs.auth_providers.oauth')"
      >
        <div class="pb-8 px-4">
          <SettingsOAuthProviderConfigurations
            v-model:config="workingConfigs"
          />
        </div>
      </HoppSmartTab>

      <HoppSmartTab id="email-auth" :label="t('configs.auth_providers.email')">
        <div class="pb-8 px-4 grid md:grid-cols-3 gap-4 md:gap-4 pt-8">
          <div class="md:col-span-1">
            <h3 class="heading">{{ t('auth.email_auth') }}</h3>
            <p class="my-1 text-secondaryLight">
              {{ t('auth.email_auth_description') }}
            </p>
            <p class="my-1 text-secondaryLight mt-4">
              {{ t('auth.email_auth_smtp_note') }}
            </p>
          </div>

          <div class="sm:px-8 md:col-span-2">
            <section>
              <h4 class="font-semibold text-secondaryDark">
                {{ t('auth.email_auth') }}
              </h4>

              <div class="space-y-4 py-4">
                <div class="flex justify-between">
                  <HoppSmartToggle
                    :on="isEmailAuthEnabled && isSMTPEnabled && isSMTPActivated"
                    :disabled="!isSMTPEnabled || !isSMTPActivated"
                    @change="toggleEmailAuth"
                  >
                    {{ t('auth.enable_email_auth') }}
                  </HoppSmartToggle>
                </div>
                <div
                  v-if="!isSMTPActivated"
                  class="flex items-center mt-5 p-3 bg-yellow-700/30 border border-yellow-900 text-secondaryDark max-w-md rounded-md"
                >
                  <icon-lucide-info class="svg-icons mr-2" />
                  <span>{{ t('auth.smtp_required') }}</span>
                </div>
              </div>
            </section>
          </div>
        </div>
      </HoppSmartTab>

      <HoppSmartTab id="token" :label="t('configs.auth_providers.token.title')">
        <div class="pb-8 px-4">
          <SettingsAuthToken v-model:config="workingConfigs" />
        </div>
      </HoppSmartTab>
    </HoppSmartTabs>
  </div>
</template>

<script setup lang="ts">
import { useVModel } from '@vueuse/core';
import { computed, onMounted, ref } from 'vue';
import { useI18n } from '~/composables/i18n';
import { ServerConfigs } from '~/helpers/configs';

const t = useI18n();

const props = defineProps<{
  config: ServerConfigs;
}>();

const emit = defineEmits<{
  (e: 'update:config', v: ServerConfigs): void;
}>();

// Auth Sub Tabs
type AuthSubTabs = 'auth-providers' | 'email-auth' | 'token';
const selectedAuthSubTab = ref<AuthSubTabs>('auth-providers');

const workingConfigs = useVModel(props, 'config', emit);

// Check if SMTP is activated but not saved yet. Used to track if SMTP was enabled after the last save.
const isSMTPActivated = computed(
  () => workingConfigs.value?.mailConfigs.enabled ?? false
);

// Check if Email authentication is enabled
const isEmailAuthEnabled = computed(() => {
  return workingConfigs.value?.mailConfigs.fields.email_auth ?? false;
});

// Toggle Email authentication
const toggleEmailAuth = () => {
  if (isSMTPEnabled.value && isSMTPActivated.value) {
    workingConfigs.value.mailConfigs.fields.email_auth =
      !workingConfigs.value.mailConfigs.fields.email_auth;
  }
};

// Check if SMTP is enabled on mount
const isSMTPEnabled = ref(false);

onMounted(() => {
  isSMTPEnabled.value = workingConfigs.value?.mailConfigs.enabled ?? false;
});
</script>
