<template>
  <div
    v-if="workingConfigs"
    class="md:grid md:grid-cols-3 md:gap-4 border-divider border-b"
  >
    <div class="pb-8 px-8 md:col-span-1">
      <h3 class="heading">{{ t('configs.auth_providers.title') }}</h3>
      <p class="my-1 text-secondaryLight">
        {{ t('configs.auth_providers.description') }}
      </p>
    </div>

    <div class="space-y-8 p-8 md:col-span-2">
      <section>
        <h4 class="font-semibold text-secondaryDark">
          {{ t('configs.auth_providers.title') }}
        </h4>

        <div
          v-for="provider in workingConfigs.providers"
          class="space-y-4 py-4"
        >
          <div class="flex items-center">
            <HoppSmartToggle
              :on="provider.enabled"
              @change="provider.enabled = !provider.enabled"
            >
              {{ capitalize(provider.name) }}
            </HoppSmartToggle>
          </div>

          <div v-if="provider.enabled" class="ml-12">
            <div
              v-for="field in providerConfigFields"
              :key="field.key"
              class="mt-5"
            >
              <label>{{ field.name }}</label>
              <span class="flex">
                <HoppSmartInput
                  v-model="provider.fields[field.key]"
                  :type="
                    isMasked(provider.name, field.key) ? 'password' : 'text'
                  "
                  :disabled="isMasked(provider.name, field.key)"
                  :autofocus="false"
                  class="!my-2 !bg-primaryLight"
                />
                <HoppButtonSecondary
                  :icon="
                    isMasked(provider.name, field.key) ? IconEye : IconEyeOff
                  "
                  class="bg-primaryLight h-9 mt-2"
                  @click="toggleMask(provider.name, field.key)"
                />
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useVModel } from '@vueuse/core';
import { reactive } from 'vue';
import { useI18n } from '~/composables/i18n';
import { Config, SsoAuthProviders } from '~/composables/useConfigHandler';
import IconEye from '~icons/lucide/eye';
import IconEyeOff from '~icons/lucide/eye-off';

const t = useI18n();

const props = defineProps<{
  config: Config;
}>();

const emit = defineEmits<{
  (e: 'update:config', v: Config): void;
}>();

const workingConfigs = useVModel(props, 'config', emit);

// Capitalize first letter of a string
const capitalize = (text: string) =>
  text.charAt(0).toUpperCase() + text.slice(1);

// Masking sensitive fields
type Field = {
  name: string;
  key: keyof Config['providers']['google' | 'github' | 'microsoft']['fields'];
};

const providerConfigFields = reactive<Field[]>([
  { name: t('configs.auth_providers.client_id'), key: 'client_id' },
  { name: t('configs.auth_providers.client_secret'), key: 'client_secret' },
]);

const maskState = reactive({
  google: {
    client_id: true,
    client_secret: true,
  },
  github: {
    client_id: true,
    client_secret: true,
  },
  microsoft: {
    client_id: true,
    client_secret: true,
  },
});

const toggleMask = (
  provider: SsoAuthProviders,
  fieldKey: keyof Config['providers'][
    | 'google'
    | 'github'
    | 'microsoft']['fields']
) => {
  maskState[provider][fieldKey] = !maskState[provider][fieldKey];
};

const isMasked = (
  provider: SsoAuthProviders,
  fieldKey: keyof Config['providers'][
    | 'google'
    | 'github'
    | 'microsoft']['fields']
) => maskState[provider][fieldKey];
</script>
