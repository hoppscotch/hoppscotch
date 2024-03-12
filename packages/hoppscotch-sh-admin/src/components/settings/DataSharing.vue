<template>
  <div class="md:grid md:grid-cols-3 md:gap-4 border-divider border-b py-8">
    <div class="px-8 md:col-span-1">
      <h3 class="heading">{{ t('configs.data_sharing.title') }}</h3>
      <p class="my-1 text-secondaryLight">
        {{ t('configs.data_sharing.description') }}
      </p>
    </div>

    <div class="mx-8 md:col-span-2">
      <h4 class="font-semibold text-secondaryDark">
        {{ t('configs.data_sharing.title') }}
      </h4>

      <div class="flex items-center space-y-4 py-4">
        <HoppSmartToggle
          :on="dataSharingConfigs.enabled"
          @change="dataSharingConfigs.enabled = !dataSharingConfigs.enabled"
        >
          {{ t('configs.data_sharing.toggle_description') }}
        </HoppSmartToggle>
      </div>

      <HoppButtonSecondary
        outline
        filled
        :icon="IconShieldQuestion"
        :label="t('configs.data_sharing.see_shared')"
        to="https://docs.hoppscotch.io/documentation/self-host/community-edition/telemetry"
        blank
        class="w-min my-2"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useVModel } from '@vueuse/core';
import { computed } from 'vue';
import { useI18n } from '~/composables/i18n';
import { Config } from '~/composables/useConfigHandler';
import IconShieldQuestion from '~icons/lucide/shield-question';

const t = useI18n();

const props = defineProps<{
  config: Config;
}>();

const emit = defineEmits<{
  (e: 'update:config', v: Config): void;
}>();

const workingConfigs = useVModel(props, 'config', emit);

// Data Sharing Configs
const dataSharingConfigs = computed({
  get() {
    return workingConfigs.value?.dataSharingConfigs;
  },
  set(value) {
    workingConfigs.value.dataSharingConfigs = value;
  },
});
</script>
