<template>
  <div class="grid md:grid-cols-3 gap-8 md:gap-4 pt-8">
    <div class="md:col-span-1">
      <h3 class="heading">{{ t('configs.mock_server.title') }}</h3>
      <p class="my-1 text-secondaryLight">
        {{ t('configs.mock_server.description') }}
      </p>
    </div>

    <div class="sm:px-8 md:col-span-2">
      <h4 class="font-semibold text-secondaryDark">
        {{ t('configs.mock_server.title') }}
      </h4>

      <div class="space-y-4 py-4">
        <div>
          <label class="block text-sm font-medium text-secondaryDark mb-1">
            {{ t('configs.mock_server.wildcard_domain') }}
          </label>
          <HoppSmartInput
            v-model="mockFields.mock_server_wildcard_domain"
            type="text"
            :placeholder="'e.g. *.mock.example.com'"
            class="!bg-primaryLight border border-divider rounded"
            input-styles="!border-0"
          />
          <p class="text-secondaryLight text-sm mt-2">
            {{ t('configs.mock_server.wildcard_domain_description') }}
          </p>
          <p class="text-secondaryLight text-sm mt-1 font-mono">
            {{ t('configs.mock_server.wildcard_domain_example') }}
          </p>
        </div>

        <div class="flex items-center justify-between">
          <div>
            <h5 class="font-medium">
              {{ t('configs.mock_server.secure_cookies') }}
            </h5>
            <p class="text-secondaryLight text-sm">
              {{ t('configs.mock_server.secure_cookies_desc') }}
            </p>
          </div>
          <HoppSmartToggle
            :on="mockFields.allow_secure_cookies"
            @change="
              mockFields.allow_secure_cookies = !mockFields.allow_secure_cookies
            "
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useVModel } from '@vueuse/core';
import { computed } from 'vue';
import { useI18n } from '~/composables/i18n';
import { ServerConfigs } from '~/helpers/configs';

const t = useI18n();

const props = defineProps<{
  config: ServerConfigs;
}>();

const emit = defineEmits<{
  (e: 'update:config', v: ServerConfigs): void;
}>();

const workingConfigs = useVModel(props, 'config', emit);

const mockFields = computed({
  get() {
    return (
      workingConfigs.value.mockServerConfigs?.fields ?? {
        mock_server_wildcard_domain: '',
        allow_secure_cookies: false,
      }
    );
  },
  set(v) {
    if (!workingConfigs.value.mockServerConfigs) {
      workingConfigs.value.mockServerConfigs = {
        name: 'mock_server',
        fields: v,
      };
    } else workingConfigs.value.mockServerConfigs.fields = v as any;
  },
});
</script>
