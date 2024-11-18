<!-- The Catch-All Page -->
<!-- Reserved for Critical Errors and 404 ONLY -->
<template>
  <div
    class="flex flex-col items-center h-screen"
    :class="{ 'min-h-screen': props.error?.statusCode !== 404 }"
  >
    <div class="flex justify-center items-center mt-10">
      <img src="/logo.svg" alt="hoppscotch-logo" class="w-20 mx-5" />
      <h1 class="text-2xl text-secondaryDark heading">Admin Dashboard</h1>
    </div>
    <div class="flex flex-col items-center justify-center h-full">
      <img
        :src="imgUrl"
        loading="lazy"
        class="inline-flex flex-col object-contain object-center mb-2 h-46 w-46"
        :alt="message"
      />
      <h1 v-if="props.error?.statusCode" class="mb-2 text-4xl heading">
        {{ props.error.statusCode }}
      </h1>
      <p class="mb-4 text-lg text-secondaryDark">{{ message }}</p>
      <p class="mt-4 space-x-2">
        <HoppButtonSecondary
          to="https://docs.hoppscotch.io/documentation"
          :icon="IconTextSearch"
          filled
          blank
          label="Documentation"
        />
        <HoppButtonSecondary
          :icon="IconRefreshCW"
          label="Reload"
          filled
          @click="reloadApplication"
        />
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import IconRefreshCW from '~icons/lucide/refresh-cw';
import IconHome from '~icons/lucide/home';
import IconTextSearch from '~icons/lucide/text-search';
import { PropType, computed } from 'vue';
import { ErrorPageData } from '~/helpers/errors';

const props = defineProps({
  error: {
    type: Object as PropType<ErrorPageData | null>,
    default: null,
  },
});

const imgUrl = `${import.meta.env.BASE_URL}images/youre_lost.svg`;

const message = computed(
  () => props.error?.message ?? 'The page you are looking for does not exist.'
);

const reloadApplication = () => {
  window.location.reload();
};
</script>
