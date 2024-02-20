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
            :on="shareData"
            @change="shareData = !shareData"
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
          <p class="text-sm font-light">Get updates about our latest news</p>
          <HoppSmartToggle
            :on="shareEmail"
            @change="shareEmail = !shareEmail"
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
import { useRouter } from 'vue-router';
import { useI18n } from '~/composables/i18n';
import { useToast } from '~/composables/toast';
import { auth } from '~/helpers/auth';
import {
  ToggleAnalyticsCollectionDocument,
  ToggleAnalyticsCollectionMutationVariables,
} from '~/helpers/backend/graphql';
import { addSubscriberNewsletterList } from '~/helpers/listmonk';
import IconBookOpenText from '~icons/lucide/book-open-text';
import IconLogIn from '~icons/lucide/log-in';
import IconShieldQuestion from '~icons/lucide/shield-question';

const t = useI18n();
const toast = useToast();
const router = useRouter();
const user = auth.getCurrentUser();

const shareData = ref(true);
const shareEmail = ref(true);

const submitSelection = async () => {
  if (shareData.value) {
    await toggleDataSharing();
  }
  if (shareEmail.value) {
    await toggleNewsletter();
  }
  router.push('/');
};

const dataSharingMutation = useMutation(ToggleAnalyticsCollectionDocument);

const toggleDataSharing = async () => {
  const status = shareData.value ? 'ENABLE' : 'DISABLE';
  const variables = { status };
  const result = await dataSharingMutation.executeMutation(
    variables as ToggleAnalyticsCollectionMutationVariables
  );
  if (result.error) {
    toast.error('Failed to update data sharing settings');
  } else {
    toast.success('Data sharing settings updated');
  }
};

const toggleNewsletter = async () => {
  shareData.value = !shareData.value;
  await addSubscriberNewsletterList(
    user?.email as string,
    user?.displayName as string
  );
};
</script>

<route lang="yaml">
meta:
  layout: empty
</route>
