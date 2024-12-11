<script lang="ts" setup>
import { useVModel } from '@vueuse/core';
import { computed } from 'vue';
import { useI18n } from '~/composables/i18n';
import { ServerConfigs } from '~/helpers/configs';

const props = defineProps<{
  config: ServerConfigs;
}>();

const emit = defineEmits<{
  (e: 'update:config', v: ServerConfigs): void;
}>();

const workingConfigs = useVModel(props, 'config', emit);

const t = useI18n();

// Get or set smtpConfigs from workingConfigs
const historyConfig = computed({
  get() {
    return workingConfigs.value?.historyConfig;
  },
  set(value) {
    workingConfigs.value.historyConfig = value;
  },
});
</script>

<template>
  <div class="grid md:grid-cols-3 gap-4 md:gap-4 pt-8">
    <div class="md:col-span-1">
      <h3 class="heading">{{ t('configs.history_configs.title') }}</h3>
      <p class="my-1 text-secondaryLight">
        {{ t('configs.history_configs.description') }}
      </p>
    </div>

    <div class="space-y-8 sm:px-8 md:col-span-2">
      <section>
        <h4 class="font-semibold text-secondaryDark">
          {{ t('configs.history_configs.title') }}
        </h4>

        <div class="space-y-4 py-4">
          <div class="flex items-center">
            <div class="flex justify-between w-full">
              <HoppSmartToggle
                :on="historyConfig.enabled"
                @change="historyConfig.enabled = !historyConfig.enabled"
              >
                {{ t('configs.history_configs.enable_history') }}
              </HoppSmartToggle>
              <HoppButtonSecondary
                blank
                v-tippy="{ theme: 'tooltip', allowHTML: true }"
                to="https://docs.hoppscotch.io/documentation/self-host/community-edition/prerequisites#email-delivery"
                :title="t('support.documentation')"
                class="rounded hover:bg-primaryDark focus-visible:bg-primaryDark"
              />
              <!-- IconHelpCircle -->
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
