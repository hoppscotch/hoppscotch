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
              {{
                t('configs.enable_auth_provider', {
                  provider:
                    provider.name.charAt(0).toUpperCase() +
                    provider.name.slice(1),
                })
              }}
            </HoppSmartToggle>
          </div>

          <div v-if="provider.enabled" class="ml-12">
            <div>
              <label for="">
                {{ t('configs.auth_providers.client_id') }}
              </label>
              <span class="flex">
                <HoppSmartInput
                  v-model="provider.fields.client_id"
                  :type="isclientIDMasked(provider.name) ? 'password' : 'text'"
                  :disabled="isclientIDMasked(provider.name)"
                  :autofocus="false"
                  class="!my-2 !bg-primaryLight"
                />
                <HoppButtonSecondary
                  :icon="isclientIDMasked(provider.name) ? IconEye : IconEyeOff"
                  class="bg-primaryLight h-9 mt-2"
                  @click="maskClientID(provider.name)"
                />
              </span>
            </div>

            <div class="mt-5">
              <label for="">
                {{ t('configs.auth_providers.client_secret') }}
              </label>
              <span class="flex">
                <HoppSmartInput
                  v-model="provider.fields.client_secret"
                  :type="
                    isClientSecretMasked(provider.name) ? 'password' : 'text'
                  "
                  :disabled="isClientSecretMasked(provider.name)"
                  :autofocus="false"
                  class="!my-2 !bg-primaryLight"
                />
                <HoppButtonSecondary
                  :icon="
                    isClientSecretMasked(provider.name) ? IconEye : IconEyeOff
                  "
                  class="bg-primaryLight h-9 mt-2"
                  @click="maskClientSecret(provider.name)"
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
import { useI18n } from '~/composables/i18n';
import IconEye from '~icons/lucide/eye';
import IconEyeOff from '~icons/lucide/eye-off';
import { useVModel } from '@vueuse/core';
import { SsoAuthProviders, Configs } from '~/composables/useConfigHandler';
import { reactive } from 'vue';

const t = useI18n();

const props = defineProps<{
  config: Configs;
}>();

const emit = defineEmits<{
  (e: 'update:config', v: Configs): void;
}>();

const workingConfigs = useVModel(props, 'config', emit);

// Masking Client ID and Client Secret of Auth Providers
type MaskInputFields = 'client_id' | 'client_secret';

const maskFields = reactive({
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

const isclientIDMasked = (provider: SsoAuthProviders) =>
  maskFields[provider].client_id;
const isClientSecretMasked = (provider: SsoAuthProviders) =>
  maskFields[provider].client_secret;

const toggleMask = (provider: SsoAuthProviders, field: MaskInputFields) =>
  (maskFields[provider][field] = !maskFields[provider][field]);

const maskClientID = (provider: SsoAuthProviders) =>
  toggleMask(provider, 'client_id');
const maskClientSecret = (provider: SsoAuthProviders) =>
  toggleMask(provider, 'client_secret');
</script>
