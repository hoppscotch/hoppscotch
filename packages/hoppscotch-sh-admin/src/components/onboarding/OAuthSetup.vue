<template>
  <div class="space-y-2 flex flex-col my-4">
    <UiAccordian
      v-for="[provider, value] in Object.entries(currentConfigs.oAuthProviders)"
      :initial-open="enabledConfigs.includes(provider as EnabledConfig)"
    >
      <template v-slot:header="{ isOpen, toggleAccordian }">
        <div class="flex items-center justify-between flex-1">
          <span class="font-semibold text-[.8rem] capitalize">{{
            provider.toLocaleLowerCase()
          }}</span>
          <span>
            <HoppSmartToggle
              :on="isOpen"
              @change="() => {
                toggleAccordian()
                emit('toggleConfig', (provider as EnabledConfig));
              }"
              class="ml-2"
            />
          </span>
        </div>
      </template>
      <template v-slot:content>
        <div class="flex flex-col space-y-4 w-full flex-1 py-4">
          <HoppSmartInput
            v-for="(_, key) in value"
            :key="key"
            v-model="currentConfigs.oAuthProviders[provider as OAuthProvider][key]"
            :label="(makeReadableKey(key as string))"
            input-styles="floating-input"
            :autofocus="false"
            class="!my-2 !bg-primaryLight flex-1"
          />
        </div>
      </template>
    </UiAccordian>
  </div>
</template>

<script lang="ts" setup>
import { useVModel } from '@vueuse/core';
import {
  Configs,
  EnabledConfig,
  makeReadableKey,
  OAuthProvider,
} from '~/composables/useOnboardingConfigHandler';

const props = defineProps<{
  currentConfigs: Configs;
  enabledConfigs: EnabledConfig[];
}>();

const emit = defineEmits<{
  (e: 'toggleConfig', provider: EnabledConfig): void;
}>();

const currentConfigs = useVModel(props, 'currentConfigs');
</script>
