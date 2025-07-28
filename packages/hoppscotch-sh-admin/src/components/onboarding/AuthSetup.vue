<template>
  <div class="flex flex-col flex-1 py-8 p-4 justify-center w-full">
    <div class="w-full max-w-screen-md mx-auto">
      <div
        v-if="isFirstTimeSetup && authConfigStep === 1"
        class="py-8 rounded max-h-lg overflow-y-auto"
      >
        <div>
          <h1 class="text-[1rem] font-normal">
            {{ t('onboarding.select_auth_provider') }}
          </h1>
        </div>
        <div>
          <div class="flex items-center space-x-4 my-8">
            <div
              class="flex flex-col space-y-2 p-5 h-40 cursor-pointer flex-1 border-2 bg-primaryLight rounded-lg border-primaryDark shadow hover:border-accent transition"
              :class="{
                '!bg-primary !border-accentDark':
                  selectedOptions.includes('OAuth'),
              }"
              @click="toggleSelectedOption('OAuth')"
            >
              <span class="text-[0.9rem] text-secondaryDark">
                {{ t('onboarding.oauth.title') }}
              </span>
              <span class="text-secondaryLight h-10">
                {{ t('onboarding.oauth.description') }}
              </span>
              <div class="my-4">
                <div class="flex items-center -space-x-2">
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
                </div>
              </div>
            </div>
            <div
              class="flex flex-col space-y-2 p-5 h-40 cursor-pointer flex-1 border-2 bg-primaryLight rounded-lg border-primaryDark shadow hover:border-accent transition"
              :class="{
                '!bg-primary !border-accentDark':
                  selectedOptions.includes('SMTP'),
              }"
              @click="toggleSelectedOption('SMTP')"
            >
              <span class="text-[0.9rem] text-secondaryDark">
                {{ t('onboarding.smtp.title') }}
              </span>
              <span class="text-secondaryLight h-10">
                {{ t('onboarding.smtp.description') }}
              </span>
              <div class="my-4">
                <div class="flex items-center -space-x-2">
                  <img
                    alt="user 2"
                    src="/assets/icons/auth/email.svg"
                    class="relative inline-block h-6 w-6 rounded-full border-2 border-primary object-cover object-center hover:z-10 focus:z-10"
                  />
                </div>
              </div>
            </div>
          </div>
          <HoppButtonPrimary
            :label="t('onboarding.add_oauth_config')"
            @click="addAuthConfig"
            :icon="IconLucideArrowRight"
            :reverse="true"
            class="mt-6"
          />
        </div>
      </div>

      <!-- Auth setup step 2 -->
      <div v-else-if="authConfigStep === 2">
        <button
          v-if="isFirstTimeSetup"
          class="items-center flex space-x-2 cursor-pointer mb-4 group"
          @click="authConfigStep = 1"
        >
          <span class="group-hover:opacity-80 transition-opacity">
            <IconLucideArrowLeft class="svg-icons" />
          </span>
          <span class="group-hover:opacity-80 transition-opacity">
            {{ t('app.back') }}
          </span>
        </button>
        <h2>
          {{ t('onboarding.add_configurations') }}
        </h2>

        <div class="my-5 overflow-y-auto max-h-[60vh]">
          <div
            id="accordion-nested-parent"
            data-accordion="collapse"
            class="space-y-4"
          >
            <UiAccordion
              v-if="selectedOptions.includes('OAuth')"
              :initial-open="isOAuthEnabled"
              class="bg-primary rounded-lg border-primaryDark shadow p-4 border flex flex-col"
            >
              <template v-slot:header="{ isOpen, toggleAccordion }">
                <div class="w-full">
                  <div class="flex items-center justify-between flex-1 mb-2">
                    <span class="font-semibold text-[0.8rem]"
                      >{{ t('onboarding.oauth.title') }}
                    </span>

                    <span>
                      <HoppSmartToggle
                        :on="isOpen"
                        @change="
                          () => {
                            toggleAccordion();
                            toggleConfig('OAUTH');
                          }
                        "
                        class="ml-2"
                      />
                    </span>
                  </div>
                  <span class="text-tiny text-secondaryLight">
                    {{ t('onboarding.oauth.description_accordian') }}
                  </span>
                </div>
              </template>
              <template v-slot:content>
                <OAuthSetup
                  v-model:currentConfigs="currentConfigs"
                  v-model:enabledConfigs="enabledConfigs"
                  @toggleConfig="toggleConfig"
                />
              </template>
            </UiAccordion>

            <UiAccordion
              v-if="selectedOptions.includes('SMTP')"
              :initial-open="enabledConfigs.includes('MAILER')"
              class="bg-primary rounded-lg border-primaryDark shadow p-4 border flex flex-col"
            >
              <template v-slot:header="{ isOpen, toggleAccordion }">
                <div class="w-full">
                  <div class="flex items-center justify-between flex-1 mb-2">
                    <span class="font-semibold text-[0.8rem]">
                      {{ t('onboarding.smtp.title') }}
                    </span>
                    <span>
                      <HoppSmartToggle
                        :on="isOpen"
                        @change="
                          () => {
                            toggleAccordion();
                            toggleConfig('EMAIL');
                            toggleSmtpConfig();
                          }
                        "
                        class="ml-2"
                      />
                    </span>
                  </div>
                  <p class="text-secondaryLight text-tiny">
                    {{ t('onboarding.smtp.description_accordian') }}
                  </p>
                </div>
              </template>
              <template v-slot:content>
                <SmtpSetup
                  v-model:currentConfigs="currentConfigs"
                  v-model:enabledConfigs="enabledConfigs"
                />
              </template>
            </UiAccordion>
          </div>
        </div>
        <HoppButtonPrimary
          :label="t('onboarding.save_auth_config')"
          @click="addOnboardingConfigs"
          :reverse="true"
          :icon="IconLucideSave"
          :loading="submittingConfigs"
          class="mt-4"
        />
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { onMounted, ref, watch } from 'vue';
import {
  OAuthProvider,
  OnBoardingSummary,
  useOnboardingConfigHandler,
} from '~/composables/useOnboardingConfigHandler';
import OAuthSetup from './OAuthSetup.vue';
import SmtpSetup from './SmtpSetup.vue';
import IconLucideArrowRight from '~icons/lucide/arrow-right';
import IconLucideArrowLeft from '~icons/lucide/arrow-left';
import IconLucideSave from '~icons/lucide/save';
import { useToast } from '~/composables/toast';
import { useI18n } from '~/composables/i18n';

const t = useI18n();
const toast = useToast();

const props = withDefaults(
  defineProps<{
    isFirstTimeSetup: boolean;
  }>(),
  {
    isFirstTimeSetup: true,
  }
);

const emit = defineEmits<{
  (
    e: 'complete-onboarding',
    payload: {
      submittingConfigs: boolean;
      summary: OnBoardingSummary;
    }
  ): void;
}>();

const authConfigStep = ref(1);

const selectedOptions = ref<Array<'OAuth' | 'SMTP' | ''>>([]);

watch(
  () => props.isFirstTimeSetup,
  (newValue) => {
    if (!newValue) {
      authConfigStep.value = 2; // Skip to step 2 if not first time setup
      selectedOptions.value = ['OAuth', 'SMTP']; // Default to both options
    } else {
      authConfigStep.value = 1; // Reset to step 1 for first time setup
      selectedOptions.value = []; // Reset selected options
    }
  },
  { immediate: true }
);

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

const OAuthProviders: OAuthProvider[] = ['GOOGLE', 'GITHUB', 'MICROSOFT'];

const isOAuthEnabled = ref(false);

onMounted(() => {
  // Check if any OAuth provider is enabled
  isOAuthEnabled.value = OAuthProviders.some((provider) =>
    enabledConfigs.value.includes(provider)
  );
});

watch(
  isProvidersLoading,
  (isLoading) => {
    if (!isLoading) {
      isOAuthEnabled.value = OAuthProviders.some((provider) =>
        enabledConfigs.value.includes(provider)
      );
    }
  },
  { immediate: true }
);

const addOnboardingConfigs = async () => {
  const res = await addOnBoardingConfigs();
  if (res && res.token) {
    emit('complete-onboarding', {
      submittingConfigs: submittingConfigs.value,
      summary: onBoardingSummary.value,
    });
  }
};

const toggleSelectedOption = (option: 'OAuth' | 'SMTP') => {
  if (selectedOptions.value.includes(option)) {
    selectedOptions.value = selectedOptions.value.filter(
      (opt) => opt !== option
    );
  } else {
    selectedOptions.value.push(option);
  }
};

const addAuthConfig = () => {
  if (selectedOptions.value.length === 0) {
    toast.error(t('onboarding.select_atleast_one'));
    return;
  }
  authConfigStep.value = 2;
};
</script>
