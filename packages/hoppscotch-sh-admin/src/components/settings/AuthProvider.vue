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
              <div v-if="field.key !== 'tenant'">
                <label>{{ field.name }}</label>
                <span class="flex">
                  <HoppSmartInput
                    v-model="provider.fields[field.key]"
                    :type="field.isMasked ? 'password' : 'text'"
                    :disabled="field.isMasked"
                    :autofocus="false"
                    class="!my-2 !bg-primaryLight w-72"
                  />
                  <HoppButtonSecondary
                    :icon="field.isMasked ? IconEye : IconEyeOff"
                    class="bg-primaryLight h-9 mt-2"
                    @click="field.isMasked = !field.isMasked"
                  />
                </span>
              </div>
              <!-- Microsoft Configs has an extra tenant field -->
              <div v-else-if="provider.name === 'microsoft'">
                <label>{{ field.name }}</label>
                <span class="flex">
                  <HoppSmartInput
                    v-model="microsoftTenant"
                    :type="field.isMasked ? 'password' : 'text'"
                    :disabled="field.isMasked"
                    :autofocus="false"
                    class="!my-2 !bg-primaryLight w-72"
                  />
                  <HoppButtonSecondary
                    :icon="field.isMasked ? IconEye : IconEyeOff"
                    class="bg-primaryLight h-9 mt-2"
                    @click="field.isMasked = !field.isMasked"
                  />
                </span>
              </div>
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
import { Config } from '~/composables/useConfigHandler';
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

// Union type for all possible field keys
type FieldKey =
  | 'client_id'
  | 'client_secret'
  | 'callback_url'
  | 'scope'
  | 'tenant';

type Field = {
  name: string;
  key: FieldKey;
  isMasked: boolean;
};

const providerConfigFields = reactive<Field[]>([
  {
    name: t('configs.auth_providers.client_id'),
    key: 'client_id',
    isMasked: true,
  },
  {
    name: t('configs.auth_providers.client_secret'),
    key: 'client_secret',
    isMasked: true,
  },
  {
    name: t('configs.auth_providers.callback_url'),
    key: 'callback_url',
    isMasked: true,
  },
  { name: t('configs.auth_providers.scope'), key: 'scope', isMasked: true },
  { name: t('configs.auth_providers.tenant'), key: 'tenant', isMasked: true },
]);

const microsoftTenant = workingConfigs.value.providers.microsoft.fields.tenant;
</script>
