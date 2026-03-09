<template>
  <div class="flex flex-col space-y-4 p-4 max-w-screen-md mx-auto w-full">
    <template
      v-if="
        onBoardingSummary.type === 'success' &&
        onBoardingSummary.configsAdded.length > 0
      "
    >
      <h1 class="text-2xl font-bold text-white flex items-center space-x-2">
        <span></span>
        {{ t('onboarding.setup_complete.title') }}
        <span class="">
          <icon-lucide-badge-check class="svg-icons text-green-500 !h-8 !w-8" />
        </span>
      </h1>
      <h2 class="text-base">
        {{ t('onboarding.setup_complete.description') }}
        <br />
        <span class="text-secondaryLight text-[0.9rem]">
          {{ t('onboarding.setup_complete.description_sub') }}
        </span>
      </h2>
      <div
        class="my-4 p-4 bg-primaryLight rounded-lg border border-primaryDark shadow"
      >
        <h3 class="text-lg mb-6">
          {{ t('onboarding.configuration_summary') }}
        </h3>
        <div v-for="config in onBoardingSummary.configsAdded" class="my-2">
          <div class="flex items-center space-x-2">
            <icon-lucide-check class="svg-icons text-green-500" />
            <p class="text-secondary">
              <span class="capitalize"> {{ config.toLocaleLowerCase() }}</span>
              {{ t('onboarding.auth_successfully_configured') }}
            </p>
          </div>
        </div>
      </div>
      <HoppButtonPrimary
        v-if="duration"
        :label="
          t('onboarding.server_restarting', {
            time: duration,
          })
        "
        :disabled="duration > 0"
        @click="emit('finish')"
        class="w-min"
      />
      <HoppButtonPrimary
        v-else
        :label="t('app.continue_to_dashboard')"
        @click="emit('finish')"
        class="w-min"
      />
    </template>
    <template v-else>
      <div class="flex flex-col space-y-4 p-4 max-w-screen-md mx-auto w-full">
        <h1 class="text-2xl font-bold text-white flex items-center space-x-2">
          <span>
            {{ t('onboarding.onboarding_incomplete.title') }}
          </span>
          <icon-lucide-alert-triangle
            class="svg-icons text-yellow-500 !h-8 !w-8"
          />
        </h1>
        <h2>
          {{ t('onboarding.onboarding_incomplete.description') }}
        </h2>
        <HoppButtonPrimary
          label="Retry Onboarding"
          @click="emit('back')"
          class="w-min"
        />
        <p class="text-secondaryLight text-tiny mt-2">
          {{ t('onboarding.onboarding_fail_help') }}
          <a
            href="https://docs.hoppscotch.io/documentation/self-host/community-edition"
            target="_blank"
            class="text-secondaryLight underline"
            >documentation</a
          >.
        </p>
      </div>
    </template>
  </div>
</template>

<script lang="ts" setup>
import { HoppButtonPrimary } from '@hoppscotch/ui';
import { onMounted, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from '~/composables/i18n';
import { OnBoardingSummary } from '~/composables/useOnboardingConfigHandler';

const t = useI18n();
const router = useRouter();

const props = defineProps<{
  onBoardingSummary: OnBoardingSummary;
  submittingConfigs: boolean;
}>();

const emit = defineEmits<{
  (e: 'back'): void;
  (e: 'finish'): void;
}>();

const duration = ref(30);
const timer = ref<NodeJS.Timeout | null>(null);

const startCountdown = () => {
  timer.value = setInterval(() => {
    duration.value--;
    if (duration.value === 0 && timer.value) {
      clearInterval(timer.value);

      // Redirect to dashboard after countdown
      router.push({ name: 'index' });
    }
  }, 1000);
};

onMounted(() => {
  if (props.onBoardingSummary.type === 'success') {
    startCountdown();
  }
});

onUnmounted(() => {
  if (!timer.value) return;
  clearInterval(timer.value);
});
</script>
