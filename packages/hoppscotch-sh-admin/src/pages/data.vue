<template>
  <div class="flex flex-col items-center justify-center min-h-screen">
    <div class="text-center">
      <h2 class="text-lg">Welcome to</h2>
      <img src="/assets/images/hoppscotch-title.svg" alt="" class="mt-2 w-56" />
    </div>
    <div
      class="bg-primaryLight mt-10 p-10 border-2 border-dividerLight rounded-lg"
    >
      <div>
        <div class="">
          <p class="text-lg font-bold text-white">Make Hoppscotch Better</p>
          <p class="text-sm font-light">
            Share anonymous data usage to improve Hoppscotch
          </p>
          <HoppSmartToggle
            :on="shareData"
            @change="shareData = !shareData"
            class="my-5 text-white"
          >
            Share data and make Hoppscotch better
          </HoppSmartToggle>
        </div>

        <div class="mt-5">
          <p class="text-lg font-bold text-white">Stay in Touch</p>
          <p class="text-sm font-light">Get updates about our latest news</p>
          <HoppSmartToggle
            :on="shareEmail"
            @change="shareEmail = !shareEmail"
            class="my-5 text-white"
          >
            Get updates about the latest at Hoppscotch
          </HoppSmartToggle>
        </div>
      </div>

      <div class="flex flex-col w-48 mx-auto mt-5">
        <HoppButtonPrimary
          :icon="IconMoveUpRight"
          label="Continue to Dashboard"
          @click="router.push('/')"
        />
        <a href="http://docs.hoppscotch.io">
          <HoppButtonSecondary
            outline
            filled
            :icon="IconBookOpenText"
            label="Read Documentation"
            class="mt-3 px-5"
          />
        </a>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { HoppButtonPrimary } from '@hoppscotch/ui';
import IconMoveUpRight from '~icons/lucide/move-up-right';
import IconBookOpenText from '~icons/lucide/book-open-text';
import { useRouter } from 'vue-router';
import { ref } from 'vue';

const router = useRouter();

const shareData = ref(true);
const shareEmail = ref(true);
</script>

<style scoped></style>

<route lang="yaml">
meta:
  layout: empty
</route>
