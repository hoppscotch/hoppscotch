<template>
  <div
    class="flex flex-col items-center justify-center min-h-screen space-y-10"
  >
    <div class="flex items-center justify-center flex-col space-y-2">
      <h2 class="text-lg">{{ t('data_sharing.welcome') }}</h2>
      <img
        src="/assets/images/hoppscotch-title.svg"
        alt="hoppscotch-title"
        class="w-52"
      />
    </div>
    <div
      class="bg-primaryLight p-10 border-2 border-dividerLight rounded-lg flex flex-col space-y-8"
    >
      <div class="flex flex-col space-y-5 items-start">
        <div>
          <p class="text-lg font-bold text-white">
            {{ t('data_sharing.title') }}
          </p>
          <p class="font-light">
            {{ t('data_sharing.description') }}
          </p>
        </div>
        <HoppSmartToggle
          :on="dataSharingToggle"
          @change="dataSharingToggle = !dataSharingToggle"
        >
          {{ t('data_sharing.toggle_description') }}
        </HoppSmartToggle>
        <HoppSmartAnchor
          blank
          to="https://docs.hoppscotch.io/documentation/self-host/community-edition/telemetry"
          :label="t('data_sharing.see_shared')"
          class="underline"
        />
      </div>
      <div class="flex flex-col items-start space-y-5">
        <div>
          <p class="text-lg font-bold text-white">
            {{ t('newsletter.title') }}
          </p>
          <p class="font-light">{{ t('newsletter.description') }}</p>
        </div>
        <HoppSmartToggle
          :on="newsletterToggle"
          @change="newsletterToggle = !newsletterToggle"
        >
          {{ t('newsletter.toggle_description') }}
        </HoppSmartToggle>
      </div>
      <div class="flex flex-col items-center space-y-5">
        <HoppButtonPrimary
          :icon="IconLogIn"
          :label="t('app.continue_to_dashboard')"
          class="mx-10"
          @click="submitSelection"
        />
        <HoppSmartAnchor
          blank
          to="http://docs.hoppscotch.io"
          :icon="IconBookOpenText"
          :label="t('app.read_documentation')"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useMutation } from '@urql/vue';
import { ref } from 'vue';
import { useI18n } from '~/composables/i18n';
import { useToast } from '~/composables/toast';
import { auth } from '~/helpers/auth';
import { listmonkApi } from '~/helpers/axiosConfig';
import {
  ServiceStatus,
  ToggleAnalyticsCollectionDocument,
} from '~/helpers/backend/graphql';
import IconBookOpenText from '~icons/lucide/book-open-text';
import IconLogIn from '~icons/lucide/log-in';

const t = useI18n();
const toast = useToast();
const user = auth.getCurrentUser();

const emit = defineEmits<{
  (event: 'setupComplete', status: boolean): void;
}>();

const dataSharingToggle = ref(true);
const newsletterToggle = ref(true);

// Toggle data sharing
const dataSharingMutation = useMutation(ToggleAnalyticsCollectionDocument);

const toggleDataSharing = async () => {
  const status = dataSharingToggle.value
    ? ServiceStatus.Enable
    : ServiceStatus.Disable;

  const result = await dataSharingMutation.executeMutation({ status });

  if (result.error) {
    toast.error(t('state.data_sharing_failure'));
    return false;
  }
  return true;
};

// Toggle subscription to newsletter
const toggleNewsletter = async () => {
  try {
    await listmonkApi.post('/subscription', {
      email: user?.email,
      name: user?.displayName,
      list_uuids: ['f5f0b457-44d0-4aa1-b6f9-165dc1efa56a'],
    });

    return true;
  } catch (e) {
    console.error(e);
    toast.error(t('state.newsletter_failure'));
    return false;
  }
};

// Submit selections made
const submitSelection = async () => {
  const dataSharingResult =
    dataSharingToggle.value && (await toggleDataSharing());
  const newsletterResult = newsletterToggle.value && (await toggleNewsletter());

  const setupDataComplete = !dataSharingToggle.value || dataSharingResult;
  const setupNewsletterComplete = !newsletterToggle.value || newsletterResult;

  emit('setupComplete', setupDataComplete && setupNewsletterComplete);
};
</script>
