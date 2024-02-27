<template>
  <div class="flex flex-col items-center justify-center min-h-screen">
    <div class="text-center">
      <h2 class="text-lg">{{ t('data_sharing.welcome') }}</h2>
      <img src="/assets/images/hoppscotch-title.svg" alt="" class="mt-2 w-56" />
    </div>
    <div
      class="bg-primaryLight mt-10 p-10 border-2 border-dividerLight rounded-lg"
    >
      <div>
        <div class="flex flex-col">
          <p class="text-lg font-bold text-white">
            {{ t('data_sharing.title') }}
          </p>
          <p class="text-sm font-light">
            {{ t('data_sharing.description') }}
          </p>
          <HoppSmartToggle
            :on="dataSharingToggle"
            @change="dataSharingToggle = !dataSharingToggle"
            class="my-5 text-white w-min justify-start"
          >
            {{ t('data_sharing.toggle_description') }}
          </HoppSmartToggle>
          <HoppButtonSecondary
            outline
            filled
            :icon="IconShieldQuestion"
            :label="t('data_sharing.see_shared')"
            to="http://docs.hoppscotch.io"
            class="w-min mx-auto mb-2"
          />
        </div>

        <div class="mt-5">
          <p class="text-lg font-bold text-white">
            {{ t('newsletter.title') }}
          </p>
          <p>{{ t('newsletter.description') }}</p>
          <HoppSmartToggle
            :on="newsletterToggle"
            @change="newsletterToggle = !newsletterToggle"
            class="my-5 text-white"
          >
            {{ t('newsletter.toggle_description') }}
          </HoppSmartToggle>
        </div>
      </div>

      <div class="flex flex-col w-48 mx-auto mt-5">
        <HoppButtonPrimary
          :icon="IconLogIn"
          :label="t('app.continue_to_dashboard')"
          @click="submitSelection"
        />
        <a href="http://docs.hoppscotch.io">
          <HoppButtonSecondary
            outline
            filled
            :icon="IconBookOpenText"
            :label="t('app.read_documentation')"
            class="mt-3 px-5"
          />
        </a>
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
  ToggleAnalyticsCollectionDocument,
  ToggleAnalyticsCollectionMutationVariables,
} from '~/helpers/backend/graphql';
import IconBookOpenText from '~icons/lucide/book-open-text';
import IconLogIn from '~icons/lucide/log-in';
import IconShieldQuestion from '~icons/lucide/shield-question';

const t = useI18n();
const toast = useToast();
const user = auth.getCurrentUser();

const emit = defineEmits<{
  (event: 'onSetupComplete', status: boolean): void;
}>();

const dataSharingToggle = ref(true);
const newsletterToggle = ref(true);

// Toggle data sharing
const dataSharingMutation = useMutation(ToggleAnalyticsCollectionDocument);

const toggleDataSharing = async () => {
  const status = dataSharingToggle.value ? 'ENABLE' : 'DISABLE';
  const variables = { status };
  const result = await dataSharingMutation.executeMutation(
    variables as ToggleAnalyticsCollectionMutationVariables
  );

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

  emit(
    'onSetupComplete',
    setupDataComplete && setupNewsletterComplete ? true : false
  );
};
</script>
