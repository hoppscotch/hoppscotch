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
                  provider: provider.name,
                })
              }}
            </HoppSmartToggle>
          </div>

          <div v-if="provider.enabled" class="ml-12">
            <div>
              <label for=""> CLIENT ID </label>
              <span class="flex">
                <HoppSmartInput
                  :type="provider.mask_client_id ? 'password' : 'text'"
                  :autofocus="false"
                  v-model="provider.client_id"
                  class="!my-2 !bg-primaryLight"
                />
                <HoppButtonSecondary
                  :icon="provider.mask_client_id ? IconEye : IconEyeOff"
                  class="bg-primaryLight h-9 mt-2"
                  @click="provider.mask_client_id = !provider.mask_client_id"
                />
              </span>
            </div>

            <div class="mt-5">
              <label for=""> SECRET ID </label>
              <span class="flex">
                <HoppSmartInput
                  :type="provider.mask_client_secret ? 'password' : 'text'"
                  :autofocus="false"
                  v-model="provider.client_secret"
                  class="!my-2 !bg-primaryLight"
                />
                <HoppButtonSecondary
                  :icon="provider.mask_client_secret ? IconEye : IconEyeOff"
                  class="bg-primaryLight h-9 mt-2"
                  @click="
                    provider.mask_client_secret = !provider.mask_client_secret
                  "
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
import { Configs } from '~/composables/useConfigHandler';

const t = useI18n();

const props = defineProps<{
  config: Configs;
}>();

const emit = defineEmits<{
  (e: 'update:config', v: Configs): void;
}>();

const workingConfigs = useVModel(props, 'config', emit);
</script>
