<template>
  <div class="md:grid md:grid-cols-3 md:gap-4 border-divider border-b py-8">
    <div class="px-8 md:col-span-1">
      <h3 class="heading">Data Sharing</h3>
      <p class="my-1 text-secondaryLight">
        Share anonymous data usage to improve Hoppscotch
      </p>
    </div>

    <div class="mt-5 mx-8 md:col-span-2">
      <section v-if="dataSharingConfigs">
        <h4 class="font-semibold text-secondaryDark">Data Sharing</h4>

        <div class="space-y-4 py-4">
          <div class="flex items-center">
            <HoppSmartToggle
              :on="dataSharingConfigs.enabled"
              @change="dataSharingConfigs.enabled = !dataSharingConfigs.enabled"
            >
              Share data and make Hoppscotch better
            </HoppSmartToggle>
          </div>

          <!-- <div class="ml-12">
            <div class="mt-5">
              <label>
                {{ t('configs.site_protection.note') }}
              </label>
            </div>
          </div> -->
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useVModel } from '@vueuse/core';
import { computed } from 'vue';
import { useI18n } from '~/composables/i18n';
import { Config } from '~/composables/useConfigHandler';

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
