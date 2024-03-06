<template>
  <SetupDataSharingAndNewsletter
    @setup-complete="(status: boolean) => (isDataSharingAndNewsletterSetup = status)"
  />
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from '~/composables/i18n';
import { useToast } from '~/composables/toast';
import { auth } from '~/helpers/auth';

const t = useI18n();
const toast = useToast();
const router = useRouter();

const isDataSharingAndNewsletterSetup = ref(false);

// Watcher is added for future proofing as we can have multiple setup steps in future
watch(
  () => isDataSharingAndNewsletterSetup.value,
  async (status) => {
    if (status) {
      const result = await auth.updateFirstTimeInfraSetupStatus();
      if (result) {
        toast.success(t('state.setup_success'));
        router.push('/dashboard');
      } else {
        toast.error(t('state.setup_failure'));
      }
    }
  }
);
</script>

<route lang="yaml">
meta:
  layout: empty
</route>
