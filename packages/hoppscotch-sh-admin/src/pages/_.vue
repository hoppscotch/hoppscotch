<!-- The Catch-All Page -->
<!-- Reserved for Critical Errors and 404 ONLY -->
<template>
  <div
    class="flex flex-col items-center justify-center"
    :class="{ 'min-h-screen': statusCode !== 404 }"
  >
    <img
      :src="`/images/youre_lost.svg`"
      loading="lazy"
      class="inline-flex flex-col object-contain object-center mb-2 h-46 w-46"
      :alt="message"
    />
    <h1 class="mb-2 text-4xl heading">
      {{ statusCode }}
    </h1>
    <p class="mb-4 text-secondaryLight">{{ message }}</p>
    <p class="mt-4 space-x-2">
      <HoppButtonSecondary to="/" :icon="IconHome" filled label="Home" />
      <HoppButtonSecondary
        :icon="IconRefreshCW"
        label="Reload"
        filled
        @click="reloadApplication"
      />
    </p>
  </div>
</template>

<script setup lang="ts">
import IconRefreshCW from '~icons/lucide/refresh-cw';
import IconHome from '~icons/lucide/home';
import { PropType, computed } from 'vue';

export type ErrorPageData = {
  message: string;
  statusCode: number;
};

const props = defineProps({
  error: {
    type: Object as PropType<ErrorPageData | null>,
    default: null,
  },
});

const statusCode = computed(() => props.error?.statusCode ?? 404);

const message = computed(
  () => props.error?.message ?? 'The page you are looking for does not exist.'
);

const reloadApplication = () => {
  window.location.reload();
};
</script>
