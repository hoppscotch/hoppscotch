<template>
  <main class="flex h-screen flex-col items-center justify-center">
    <div
      class="fixed top-0 left-0 p-5 flex items-center justify-between w-full"
    >
      <span class="text-md font-bold">{{ t('app.name') }}</span>
      <HoppButtonPrimary
        v-if="!isFirstTimeSetup"
        :label="t('app.continue_to_dashboard')"
        @click="goToDashboard"
      />
    </div>

    <div v-if="isLoading" class="flex flex-1 justify-center items-center">
      <HoppSmartSpinner />
    </div>

    <template v-else>
      <WelcomeScreen v-if="step === STEP.WELCOME" @next="nextStep" />

      <AuthSetup
        v-else-if="step === STEP.AUTH"
        :is-first-time-setup="isFirstTimeSetup"
        @complete-onboarding="(payload:SuccessPayload) => finishOnboarding(payload)"
      />

      <CompleteOnboarding
        v-else
        :on-boarding-summary="onBoardingSummary"
        :submitting-configs="submittingConfigs"
        @back="prevStep"
        @finish="goToDashboard"
      />
    </template>
  </main>
</template>
<script setup lang="ts">
import { HoppButtonPrimary } from '@hoppscotch/ui';
import { onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import AuthSetup from '~/components/onboarding/AuthSetup.vue';
import CompleteOnboarding from '~/components/onboarding/CompleteScreen.vue';
import WelcomeScreen from '~/components/onboarding/WelcomeScreen.vue';
import { useI18n } from '~/composables/i18n';
import { OnBoardingSummary } from '~/composables/useOnboardingConfigHandler';
import { auth } from '~/helpers/auth';

const t = useI18n();
const router = useRouter();

// Steps
enum STEP {
  WELCOME = 1,
  AUTH = 2,
  COMPLETE = 3,
}

type SuccessPayload = {
  submittingConfigs: boolean;
  summary: OnBoardingSummary;
};

const step = ref<STEP>(STEP.WELCOME);
const isFirstTimeSetup = ref(true);
const isLoading = ref(false);

const onBoardingSummary = ref<OnBoardingSummary>({
  type: 'success',
  configsAdded: [],
  description: '',
  message: '',
});

const submittingConfigs = ref(false);

// Sync from query param
const syncStepFromRoute = () => {
  const queryStep = parseInt(
    router.currentRoute.value.query.step as string,
    10
  );
  if (
    !isNaN(queryStep) &&
    queryStep >= STEP.WELCOME &&
    queryStep <= STEP.COMPLETE
  ) {
    step.value = queryStep;
  }
};

const goToDashboard = () => {
  router.push({ name: 'dashboard' });
};

// Watch route changes (e.g., browser back/forward)
watch(
  () => router.currentRoute.value.query.step,
  () => {
    if (isFirstTimeSetup.value) syncStepFromRoute();
  }
);

// Push to URL when step changes
watch(step, async (newStep) => {
  if (newStep !== STEP.COMPLETE) {
    router.replace({ name: 'onboarding', query: { step: newStep.toString() } });
  }
});

// Load onboarding status
onMounted(async () => {
  const onboardingStatus = await auth.getOnboardingStatus();
  isFirstTimeSetup.value = !onboardingStatus?.onboardingCompleted;
  isLoading.value = false;

  if (!isFirstTimeSetup.value) {
    step.value = STEP.AUTH;
  } else {
    syncStepFromRoute();
  }
});

// Step Controls
const nextStep = () => step.value++;
const prevStep = () => step.value--;
const finishOnboarding = (payload: {
  submittingConfigs: boolean;
  summary: OnBoardingSummary;
}) => {
  step.value = STEP.COMPLETE;
  onBoardingSummary.value = payload.summary;
  submittingConfigs.value = payload.submittingConfigs;
};
</script>

<route lang="yaml">
meta:
  layout: empty
</route>
