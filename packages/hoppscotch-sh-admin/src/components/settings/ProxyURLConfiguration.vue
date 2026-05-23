<template>
  <div class="grid md:grid-cols-3 gap-8 md:gap-4 pt-8">
    <div class="md:col-span-1">
      <h3 class="heading">{{ t('configs.proxy_url_configs.title') }}</h3>
      <p class="my-1 text-secondaryLight">
        {{ t('configs.proxy_url_configs.description') }}
      </p>
    </div>

    <div class="sm:px-8 md:col-span-2">
      <h4 class="font-semibold text-secondaryDark">
        {{ t('configs.proxy_url_configs.title') }}
      </h4>

      <div class="flex items-center space-y-4 py-4">
        <div class="flex justify-between w-full">
          <HoppSmartInput
            v-model="proxyConfigs.fields.proxy_app_url"
            :placeholder="t('configs.proxy_url_configs.url_placeholder')"
            :autofocus="false"
            class="!my-2 !bg-primaryLight w-full max-w-xs"
          />

          <HoppButtonSecondary
            v-tippy="{ theme: 'tooltip', allowHTML: true }"
            blank
            to="https://docs.hoppscotch.io/documentation/self-host/community-edition"
            :title="t('support.documentation')"
            :icon="IconHelpCircle"
            class="rounded hover:bg-primaryDark focus-visible:bg-primaryDark"
          />
        </div>
      </div>
      <div
        v-if="getFieldError('proxy_app_url')"
        class="flex items-center justify-between px-2 font-semibold text-red-700 rounded-lg max-w-lg"
      >
        <div class="flex items-center">
          <icon-lucide-info class="mr-2" />
          <span>{{ t('configs.proxy_url_configs.input_validation') }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useVModel } from '@vueuse/core';
import { computed, watch } from 'vue';
import { useI18n } from '~/composables/i18n';
import {
  hasInputValidationFailed,
  isValidProxyUrl,
  ServerConfigs,
} from '~/helpers/configs';
import IconHelpCircle from '~icons/lucide/help-circle';

const t = useI18n();

const props = defineProps<{
  config: ServerConfigs;
}>();

const emit = defineEmits<{
  (e: 'update:config', v: ServerConfigs): void;
}>();

const workingConfigs = useVModel(props, 'config', emit);

const proxyConfigs = computed({
  get() {
    return workingConfigs.value?.proxyUrlConfigs;
  },
  set(value) {
    workingConfigs.value.proxyUrlConfigs = value;
  },
});

// Input Validation — uses the shared regex helper so the UI accepts exactly
// what the backend's validateUrl will (and what the kernel store will persist).
// Empty is also flagged here so the inline error banner appears in-context,
// matching the app-side Proxy.vue behavior. AreAnyConfigFieldsEmpty still
// blocks save for empty, but this gives the user a visible field-level signal.
const fieldErrors = computed(() => {
  const errors: Record<string, boolean> = {};

  const value = proxyConfigs.value?.fields.proxy_app_url ?? '';
  errors.proxy_app_url = !isValidProxyUrl(value);

  return errors;
});

const getFieldError = (
  fieldKey: keyof ServerConfigs['proxyUrlConfigs']['fields'],
) => fieldErrors.value[fieldKey];

// `immediate: true` so a pre-existing invalid stored value (e.g. junk left
// over from earlier flows) flags the global save guard on mount, not just
// after the user re-types the field.
watch(
  fieldErrors,
  (errors) => {
    hasInputValidationFailed.value.proxyUrl =
      Object.values(errors).some(Boolean);
  },
  { immediate: true },
);
</script>
