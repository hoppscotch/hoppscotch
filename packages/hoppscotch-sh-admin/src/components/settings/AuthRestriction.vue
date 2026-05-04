<template>
  <div class="grid md:grid-cols-3 gap-8 md:gap-4 pt-8">
    <div class="md:col-span-1">
      <h3 class="heading">{{ t('configs.auth_restriction.title') }}</h3>
      <p class="my-1 text-secondaryLight">
        {{ t('configs.auth_restriction.description') }}
      </p>
    </div>

    <div class="sm:px-8 md:col-span-2">
      <h4 class="font-semibold text-secondaryDark">
        {{ t('configs.auth_restriction.title') }}
      </h4>

      <div class="flex items-center space-y-4 py-4">
        <div class="flex justify-between w-full">
          <HoppSmartToggle
            :on="authRestrictionEnabled"
            @change="authRestrictionEnabled = !authRestrictionEnabled"
          >
            {{ t('configs.auth_restriction.toggle_description') }}
          </HoppSmartToggle>
        </div>
      </div>

      <p class="my-1 text-secondaryLight">
        {{ t('configs.auth_restriction.warning') }}
      </p>
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

// Auth Restriction Config
const authRestrictionEnabled = computed({
  get() {
    return workingConfigs.value?.authRestrictionConfig?.enabled ?? false;
  },
  set(value) {
    if (workingConfigs.value.authRestrictionConfig) {
      workingConfigs.value.authRestrictionConfig.enabled = value;
    }
  },
});
</script>
