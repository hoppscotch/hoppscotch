<template>
  <div v-if="rateLimitConfig" class="grid md:grid-cols-3 gap-4 md:gap-4 pt-8">
    <div class="md:col-span-1 px-4">
      <h3 class="heading">{{ t('configs.rate_limit.title') }}</h3>
      <p class="my-1 text-secondaryLight">
        {{ t('configs.rate_limit.description') }}
      </p>
    </div>

    <div class="space-y-8 sm:px-8 md:col-span-2">
      <section>
        <div class="flex items-center justify-between">
          <h4 class="font-semibold text-secondaryDark">
            {{ t('configs.rate_limit.title') }}
          </h4>
          <HoppButtonSecondary
            blank
            v-tippy="{ theme: 'tooltip', allowHTML: true }"
            to="https://docs.hoppscotch.io/documentation/self-host/community-edition/prerequisites#email-delivery"
            :title="t('support.documentation')"
            :icon="IconHelpCircle"
            class="rounded hover:bg-primaryDark focus-visible:bg-primaryDark"
          />
        </div>

        <div class="space-y-4 py-4">
          <div class="">
            <div class="max-w-xs flex flex-col space-y-4">
              <div class="flex flex-col space-y-2">
                <label>{{ t('configs.rate_limit.rate_limit_ttl') }}</label>
                <HoppSmartInput
                  v-model="rateLimitConfig.fields.rate_limit_ttl"
                  placeholder="e.g., 60 (in seconds)"
                  :autofocus="false"
                  class="!my-2 !bg-primaryLight flex-1"
                  @update:model-value="
                    validateNumberValue(rateLimitConfig.fields.rate_limit_ttl)
                  "
                />
              </div>
              <div class="flex flex-col space-y-2">
                <label>{{ t('configs.rate_limit.rate_limit_max') }}</label>
                <HoppSmartInput
                  v-model="rateLimitConfig.fields.rate_limit_max"
                  placeholder="e.g., 100 (requests per TTL)"
                  :autofocus="false"
                  class="!my-2 !bg-primaryLight flex-1"
                  @update:model-value="
                    validateNumberValue(rateLimitConfig.fields.rate_limit_max)
                  "
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { useVModel } from '@vueuse/core';
import { computed } from 'vue';
import { useI18n } from '~/composables/i18n';
import { useToast } from '~/composables/toast';
import { ServerConfigs } from '~/helpers/configs';
import IconHelpCircle from '~icons/lucide/help-circle';

const t = useI18n();
const toast = useToast();

const props = defineProps<{
  config: ServerConfigs;
}>();

const emit = defineEmits<{
  (e: 'update:config', v: ServerConfigs): void;
}>();

const workingConfigs = useVModel(props, 'config', emit);

// Get or set rate limit from workingConfigs
const rateLimitConfig = computed({
  get: () => workingConfigs.value?.rateLimitConfigs,
  set: (value) => (workingConfigs.value.rateLimitConfigs = value),
});

const validateNumberValue = (value: string | number) => {
  const num = typeof value === 'string' ? parseInt(value, 10) : value;
  if (isNaN(num) || num <= 0) {
    toast.error(t('configs.invalid_number'));
  }
};
</script>

<style lang="scss">
/* Chrome, Safari, Edge, Opera */
input::-webkit-outer-spin-button,
input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

/* Firefox */
input[type='number'] {
  -moz-appearance: textfield;
  appearance: textfield;
}
</style>
