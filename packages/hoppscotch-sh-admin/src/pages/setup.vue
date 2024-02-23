<template>
  <SetupDataSharing @onSetupComplete="dataAnalyticsSetup" />
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { auth } from '~/helpers/auth';

const router = useRouter();
const dataAnalyticsSetup = async (status: boolean) => {
  if (status) {
    const result = await auth.updateFirstTimeInfraSetupStatus();
    if (result) {
      console.log('Data sharing setup complete');

      router.push('/dashboard');
    }
  }
};
</script>

<route lang="yaml">
meta:
  layout: empty
</route>
