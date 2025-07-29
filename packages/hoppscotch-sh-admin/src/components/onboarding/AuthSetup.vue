<template>
  <div class="flex flex-col flex-1 py-8 p-4 justify-center w-full">
    <div class="w-full max-w-screen-md mx-auto">
      <!-- auth providers -->
      <div class="space-y-2 flex flex-col">
        <div v-if="isFirstTimeSetup" class="flex max-w-xs space-x-3">
          <span class="w-10 h-1 rounded-sm bg-accent"></span>
          <span
            class="w-10 h-1 rounded-sm bg-primaryDark"
            :class="{
              '!bg-accent': authConfigStep === 2,
            }"
          ></span>
        </div>
        <div class="flex flex-col space-y-1 py-6">
          <template v-if="authConfigStep === 1">
            <h1 class="text-xl">{{ t('onboarding.select_auth_methods') }}</h1>
            <h2 class="text-base font-normal text-secondaryLight">
              {{ t('onboarding.select_auth_provider') }}
            </h2>
          </template>
          <template v-else>
            <h1 class="text-xl">{{ t('onboarding.add_configurations') }}</h1>
            <h2 class="text-base font-normal text-secondaryLight">
              {{ t('onboarding.add_configurations_description') }}
            </h2>
          </template>
        </div>
      </div>

      <div class="min-h-[50vh]">
        <template v-if="isFirstTimeSetup && authConfigStep === 1">
          <div class="rounded max-h-lg">
            <div class="flex items-center gap-4 mb-8 flex-wrap">
              <AuthProviderCard
                title="onboarding.oauth.title"
                description="onboarding.oauth.description"
                :selected="isSelected('OAUTH') && isOAuthEnabled"
                @click="toggleSelectedOption('OAUTH')"
              >
                <img
                  alt="user 1"
                  src="/assets/icons/auth/google.svg"
                  class="relative inline-block h-6 w-6 rounded-full border-2 border-primary object-cover object-center hover:z-10 focus:z-10"
                />
                <img
                  alt="user 2"
                  src="/assets/icons/auth/github.svg"
                  class="relative inline-block h-6 w-6 rounded-full border-2 border-primary object-cover object-center hover:z-10 focus:z-10"
                />
                <img
                  alt="user 3"
                  src="/assets/icons/auth/microsoft.svg"
                  class="relative inline-block h-6 w-6 rounded-full border-2 border-primary object-cover object-center hover:z-10 focus:z-10"
                />
              </AuthProviderCard>

              <AuthProviderCard
                title="onboarding.smtp.title"
                description="onboarding.smtp.description"
                :selected="isSelected('SMTP')"
                @click="toggleSelectedOption('SMTP')"
              >
                <img
                  alt="user 2"
                  src="/assets/icons/auth/email.svg"
                  class="relative inline-block h-6 w-6 rounded-full border-2 border-primary object-cover object-center hover:z-10 focus:z-10"
                />
              </AuthProviderCard>
            </div>

            <HoppButtonPrimary
              :label="t('onboarding.add_oauth_config')"
              @click="proceedToConfig"
              :icon="IconLucideArrowRight"
              :reverse="true"
              class="mt-6"
            />
          </div>
        </template>

        <!-- configure selected providers -->
        <template v-else-if="authConfigStep === 2">
          <div class="my-5 overflow-y-auto max-h-[60vh] space-y-4">
            <UiAccordion
              v-if="isSelected('OAUTH')"
              :initial-open="isOAuthEnabled || isSelected('OAUTH')"
              title="onboarding.oauth.title"
              description="onboarding.oauth.description_accordian"
              @toggle="toggleConfig('OAUTH')"
              class="bg-primary rounded-lg border-primaryDark shadow p-4 border flex flex-col"
            >
              <OAuthSetup
                v-model:currentConfigs="currentConfigs"
                v-model:enabledConfigs="enabledConfigs"
                @toggleConfig="toggleConfig"
              />
            </UiAccordion>

            <UiAccordion
              v-if="isSelected('SMTP')"
              :initial-open="isSmtpEnabled"
              title="onboarding.smtp.title"
              description="onboarding.smtp.description_accordian"
              @toggle="
                () => {
                  toggleConfig('EMAIL');
                  toggleSmtpConfig();
                }
              "
              class="bg-primary rounded-lg border-primaryDark shadow p-4 border flex flex-col"
            >
              <SmtpSetup
                v-model:currentConfigs="currentConfigs"
                v-model:enabledConfigs="enabledConfigs"
              />
            </UiAccordion>
          </div>

          <div class="flex items-center space-x-4 mt-6">
            <HoppButtonSecondary
              v-if="isFirstTimeSetup && authConfigStep === 2"
              :label="t('app.back')"
              @click="
                () => {
                  authConfigStep = 1;
                  selectedOptions = [];
                  enabledConfigs = [];
                }
              "
              :reverse="true"
              :icon="IconLucideArrowLeft"
              :loading="submittingConfigs"
              :outline="true"
            />
            <HoppButtonPrimary
              :label="t('onboarding.save_auth_config')"
              @click="submitConfigs"
              :reverse="true"
              :icon="IconLucideSave"
              :loading="submittingConfigs"
            />
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, watch, onMounted, computed } from 'vue';
import { useToast } from '~/composables/toast';
import { useI18n } from '~/composables/i18n';
import {
  useOnboardingConfigHandler,
  OAuthProvider,
  OnBoardingSummary,
} from '~/composables/useOnboardingConfigHandler';

import OAuthSetup from './OAuthSetup.vue';
import SmtpSetup from './SmtpSetup.vue';

import IconLucideArrowRight from '~icons/lucide/arrow-right';
import IconLucideArrowLeft from '~icons/lucide/arrow-left';
import IconLucideSave from '~icons/lucide/save';
import AuthProviderCard from './AuthProviderCard.vue';

const t = useI18n();
const toast = useToast();

const props = defineProps<{ isFirstTimeSetup?: boolean }>();
const emit = defineEmits<{
  (
    e: 'complete-onboarding',
    payload: { submittingConfigs: boolean; summary: OnBoardingSummary }
  ): void;
}>();

type SelectedOption = 'OAUTH' | 'SMTP';

const authConfigStep = ref(1);
const selectedOptions = ref<SelectedOption[]>([]);

const {
  currentConfigs,
  enabledConfigs,
  isProvidersLoading,
  submittingConfigs,
  onBoardingSummary,
  addOnBoardingConfigs,
  toggleConfig,
  toggleSmtpConfig,
} = useOnboardingConfigHandler();

const OAuthProviders: (OAuthProvider | 'OAUTH')[] = [
  'GOOGLE',
  'GITHUB',
  'MICROSOFT',
  'OAUTH',
];
const isOAuthEnabled = ref(false);

onMounted(() => {
  updateOAuthEnabled();
});

watch(isProvidersLoading, (loading) => {
  if (!loading) updateOAuthEnabled();
});

watch(
  () => enabledConfigs.value,
  (configs) => {
    isOAuthEnabled.value = OAuthProviders.some((provider) =>
      configs.includes(provider)
    );
  },
  { immediate: true }
);

watch(
  () => props.isFirstTimeSetup,
  (initialSetup) => {
    if (initialSetup) {
      authConfigStep.value = 1;
      selectedOptions.value = [];
    } else {
      authConfigStep.value = 2;
      selectedOptions.value = ['OAUTH', 'SMTP'];
    }
  },
  { immediate: true }
);

const isSelected = (option: SelectedOption) =>
  selectedOptions.value.includes(option as any);

const isSmtpEnabled = computed(() => enabledConfigs.value.includes('MAILER'));

const updateOAuthEnabled = () => {
  isOAuthEnabled.value = OAuthProviders.some((provider) =>
    enabledConfigs.value.includes(provider)
  );
};

const toggleSelectedOption = (option: SelectedOption) => {
  if (selectedOptions.value.includes(option as any)) {
    selectedOptions.value = selectedOptions.value.filter(
      (opt) => opt !== option
    );
  } else {
    selectedOptions.value.push(option as any);
  }
  if (option === 'SMTP') {
    toggleConfig('EMAIL');
    toggleSmtpConfig();
  } else {
    toggleConfig(option);
  }
};

const proceedToConfig = () => {
  if (!selectedOptions.value.length) {
    toast.error(t('onboarding.select_atleast_one'));
    return;
  }
  authConfigStep.value = 2;
};

const submitConfigs = async () => {
  const res = await addOnBoardingConfigs();
  if (res?.token) {
    emit('complete-onboarding', {
      submittingConfigs: submittingConfigs.value,
      summary: onBoardingSummary.value,
    });
  }
};
</script>
