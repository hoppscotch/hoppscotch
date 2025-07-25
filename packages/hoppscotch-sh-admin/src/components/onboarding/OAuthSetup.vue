<template>
  <div class="space-y-2 flex flex-col my-4">
    <UiAccordion
      v-for="[provider, value] in Object.entries(currentConfigs.oAuthProviders)"
      :initial-open="enabledConfigs.includes(provider as EnabledConfig)"
    >
      <template v-slot:header="{ isOpen, toggleAccordion }">
        <div class="flex items-center justify-between flex-1">
          <span class="font-semibold text-[.8rem] capitalize">{{
            provider.toLocaleLowerCase()
          }}</span>
          <span>
            <HoppSmartToggle
              :on="isOpen"
              @change="() => {
                toggleAccordion()
                emit('toggleConfig', (provider as EnabledConfig));
              }"
            />
          </span>
        </div>
      </template>
      <template v-slot:content>
        <div class="flex flex-col space-y-4 w-full flex-1 py-4">
          <template v-for="(_, key) in value" :key="key">
            <HoppSmartInput
              v-if="isCallbackUrl(key as string)"
              v-model="currentConfigs.oAuthProviders[provider as OAuthProvider][key]"
              :label="(makeReadableKey(key as string))"
              input-styles="floating-input !border-0"
              :autofocus="false"
              class="!my-2 !bg-primaryLight flex-1"
              :disabled="true"
            >
              <template
                #button
                v-if="currentConfigs.oAuthProviders[provider as OAuthProvider][key]"
              >
                <HoppSmartItem
                  v-tippy="{ theme: 'tooltip' }"
                  :icon="IconLucideCopy"
                  :title="'Copy to clipboard'"
                  @click="() => {}"
                  class="hover:bg-transparent"
                />
              </template>
            </HoppSmartInput>
            <HoppSmartInput
              v-else
              v-model="currentConfigs.oAuthProviders[provider as OAuthProvider][key]"
              :label="(makeReadableKey(key as string))"
              input-styles="floating-input"
              :autofocus="false"
              class="!my-2 !bg-primaryLight flex-1"
            />
          </template>
        </div>
      </template>
    </UiAccordion>
  </div>
</template>

<script lang="ts" setup>
import { HoppSmartItem } from '@hoppscotch/ui';
import { useVModel } from '@vueuse/core';
import {
  Configs,
  EnabledConfig,
  makeReadableKey,
  OAuthProvider,
} from '~/composables/useOnboardingConfigHandler';
import IconLucideCopy from '~icons/lucide/copy';

const props = defineProps<{
  currentConfigs: Configs;
  enabledConfigs: EnabledConfig[];
}>();

const emit = defineEmits<{
  (e: 'toggleConfig', provider: EnabledConfig): void;
}>();

const currentConfigs = useVModel(props, 'currentConfigs');

// check if the key is a callback URL
const isCallbackUrl = (key: string): boolean => {
  return key.toLowerCase().includes('callback');
};
</script>
