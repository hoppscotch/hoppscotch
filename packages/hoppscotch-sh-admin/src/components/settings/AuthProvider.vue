<template>
  <div class="md:grid md:grid-cols-3 md:gap-4 border-divider border-b">
    <div class="pb-8 px-8 md:col-span-1">
      <h3 class="heading">Auth Providers</h3>
      <p class="my-1 text-secondaryLight">
        Configure the auth providers for your team.
      </p>
    </div>

    <div class="space-y-8 p-8 md:col-span-2">
      <section>
        <h4 class="font-semibold text-secondaryDark">Auth Providers</h4>

        <div v-for="provider in workingConfigs" class="space-y-4 py-4">
          <div class="flex items-center">
            <HoppSmartToggle
              :on="provider.enabled"
              @change="provider.enabled = !provider.enabled"
            >
              {{
                t('config.enable_auth_provider', {
                  provider:
                    provider.name.charAt(0).toUpperCase() +
                    provider.name.slice(1),
                })
              }}
            </HoppSmartToggle>
          </div>

          <div v-if="provider.enabled" class="ml-12">
            <div>
              <label for=""> CLIENT ID </label>
              <span class="flex">
                <HoppSmartInput
                  v-model="provider.client_id"
                  :type="clientIDStatus(provider.name) ? 'password' : 'text'"
                  :disabled="clientIDStatus(provider.name)"
                  :autofocus="false"
                  class="!my-2 !bg-primaryLight"
                />
                <HoppButtonSecondary
                  :icon="clientIDStatus(provider.name) ? IconEye : IconEyeOff"
                  class="bg-primaryLight h-9 mt-2"
                  @click="maskClientID(provider.name)"
                />
              </span>
            </div>

            <div class="mt-5">
              <label for=""> SECRET ID </label>
              <span class="flex">
                <HoppSmartInput
                  v-model="provider.client_secret"
                  :type="
                    clientSecretStatus(provider.name) ? 'password' : 'text'
                  "
                  :disabled="clientSecretStatus(provider.name)"
                  :autofocus="false"
                  class="!my-2 !bg-primaryLight"
                />
                <HoppButtonSecondary
                  :icon="
                    clientSecretStatus(provider.name) ? IconEye : IconEyeOff
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
import { AuthProviders, Configs } from '~/composables/useConfigHandler';
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

const maskInputs = reactive({
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

const clientIDStatus = (provider: AuthProviders) =>
  maskInputs[provider].client_id;
const clientSecretStatus = (provider: AuthProviders) =>
  maskInputs[provider].client_secret;

const toggleMask = (provider: AuthProviders, field: MaskInputFields) =>
  (maskInputs[provider][field] = !maskInputs[provider][field]);

const maskClientID = (provider: AuthProviders) =>
  toggleMask(provider, 'client_id');
const maskClientSecret = (provider: AuthProviders) =>
  toggleMask(provider, 'client_secret');
</script>
