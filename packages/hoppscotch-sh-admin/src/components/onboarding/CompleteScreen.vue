<template>
  <div class="flex flex-col space-y-4 p-4 max-w-screen-md mx-auto w-full">
    <template
      v-if="
        onBoardingSummary.type === 'success' &&
        onBoardingSummary.configsAdded.length > 0
      "
    >
      <h1 class="text-2xl font-bold text-white">Setup Complete 🎉</h1>
      <h2>
        You have successfully completed the onboarding process for your
        Hoppscotch instance.
        <br />
        Click the button below to finish and start using your instance.
      </h2>
      <div
        class="my-4 p-4 bg-primaryLight rounded-lg border border-primaryDark shadow"
      >
        <h3 class="text-lg mb-6">Configuration Summary</h3>
        <div v-for="config in onBoardingSummary.configsAdded" class="my-2">
          <div class="flex items-center space-x-2">
            <icon-lucide-check class="svg-icons text-green-500" />
            <p class="text-secondary">
              <span class="capitalize"> {{ config.toLocaleLowerCase() }}</span>
              authentication has been successfully configured.
            </p>
          </div>
        </div>
      </div>
      <HoppButtonPrimary
        v-if="duration"
        :label="`Server is restarting in ${duration} seconds...`"
        :disabled="duration > 0"
        @click="emit('finish')"
        class="w-min"
      />
      <HoppButtonPrimary
        v-else
        label="Go to Dashboard"
        @click="emit('finish')"
        class="w-min"
      />
    </template>
    <template v-else>
      <h1 class="text-2xl font-bold text-white">Onboarding Incomplete</h1>
      <h2>
        There was an issue completing the onboarding process. Please check the
        configurations and try again.
      </h2>
      <HoppButtonPrimary
        label="Retry Onboarding"
        @click="emit('back')"
        class="w-min"
      />
      <p class="text-secondaryLight text-tiny mt-2">
        If you need help, please refer to the
        <a
          href="https://docs.hoppscotch.io/documentation/self-host/community-edition"
          target="_blank"
          class="text-secondaryLight underline"
          >documentation</a
        >.
      </p>
    </template>
  </div>
</template>

<script lang="ts" setup>
import { HoppButtonPrimary } from '@hoppscotch/ui';
import { onMounted, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { OnBoardingSummary } from '~/composables/useOnboardingConfigHandler';

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
      router.push({ name: 'dashboard' });
    }
  }, 1000);
};

onMounted(() => {
  if (props.submittingConfigs && props.onBoardingSummary.type === 'success') {
    startCountdown();
  }
});

onUnmounted(() => {
  if (!timer.value) return;
  clearInterval(timer.value);
});
</script>
