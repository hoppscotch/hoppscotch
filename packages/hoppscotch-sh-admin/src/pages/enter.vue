<template>
  <div class="flex flex-col items-center justify-center min-h-screen">
    <HoppSmartSpinner v-if="signingInWithEmail" />
    <AppLogo v-else class="w-16 h-16 rounded" />
    <pre v-if="error" class="mt-4 text-secondaryLight">{{ error }}</pre>
  </div>
</template>

<script setup lang="ts">
import { onBeforeMount, onMounted, ref } from 'vue';
import { auth } from '~/helpers/auth';

const signingInWithEmail = ref(false);
const error = ref(null);

onBeforeMount(async () => {
  await auth.performAuthInit();
});

onMounted(async () => {
  signingInWithEmail.value = true;
  try {
    await auth.processMagicLink();
  } catch (e: any) {
    error.value = e.message;
  } finally {
    signingInWithEmail.value = false;
  }
});
</script>

<route lang="yaml">
meta:
  layout: empty
</route>
