<template>
  <div v-if="authTokenConfig" class="grid md:grid-cols-3 gap-4 md:gap-4 pt-8">
    <div class="md:col-span-1">
      <h3 class="heading">{{ t('configs.auth_providers.token.title') }}</h3>
      <p class="my-1 text-secondaryLight">
        {{ t('configs.auth_providers.token.description') }}
      </p>
    </div>

    <div class="space-y-8 sm:px-8 md:col-span-2">
      <section>
        <div class="flex items-center justify-end">
          <HoppButtonSecondary
            blank
            v-tippy="{ theme: 'tooltip', allowHTML: true }"
            to="https://docs.hoppscotch.io/documentation/self-host/community-edition/prerequisites#email-delivery"
            :title="t('support.documentation')"
            :icon="IconHelpCircle"
            class="rounded hover:bg-primaryDark focus-visible:bg-primaryDark"
          />
        </div>

        <div class="space-y-4 pt-10 pb-4">
          <div class="">
            <div class="max-w-xs flex flex-col space-y-4">
              <div class="flex flex-col space-y-2">
                <label>{{
                  t('configs.auth_providers.token.jwt_secret')
                }}</label>
                <HoppSmartInput
                  v-model="authTokenConfig.fields.jwt_secret"
                  placeholder="e.g., your-secret-key"
                  :autofocus="false"
                  class="!my-2 !bg-primaryLight flex-1 border border-divider rounded"
                  input-styles="!border-0 "
                  :type="isMasked('jwt_secret') ? 'password' : 'text'"
                >
                  <template #button>
                    <HoppButtonSecondary
                      :icon="isMasked('jwt_secret') ? IconEye : IconEyeOff"
                      class="bg-primaryLight rounded"
                      @click="toggleMask('jwt_secret')"
                    />
                  </template>
                </HoppSmartInput>
              </div>
              <div class="flex flex-col space-y-2">
                <label>{{
                  t('configs.auth_providers.token.token_salt_complexity')
                }}</label>
                <HoppSmartInput
                  v-model="authTokenConfig.fields.token_salt_complexity"
                  placeholder="e.g., 10 (salt complexity)"
                  :autofocus="false"
                  class="!my-2 !bg-primaryLight flex-1"
                  type="number"
                  @update:model-value="
                    validateNumberValue(
                      authTokenConfig.fields.token_salt_complexity
                    )
                  "
                />
              </div>
              <div class="flex flex-col space-y-2">
                <label>{{
                  t('configs.auth_providers.token.magic_link_token_validity')
                }}</label>
                <HoppSmartInput
                  v-model="authTokenConfig.fields.magic_link_token_validity"
                  placeholder="e.g., 3 (in hour)"
                  :autofocus="false"
                  class="!my-2 !bg-primaryLight flex-1"
                  type="number"
                  @update:model-value="
                    validateNumberValue(
                      authTokenConfig.fields.magic_link_token_validity
                    )
                  "
                />
              </div>
              <div class="flex flex-col space-y-2">
                <label>{{
                  t('configs.auth_providers.token.refresh_token_validity')
                }}</label>
                <HoppSmartInput
                  v-model="authTokenConfig.fields.refresh_token_validity"
                  placeholder="e.g., 604800000 (in milliseconds)"
                  :autofocus="false"
                  class="!my-2 !bg-primaryLight flex-1"
                  type="number"
                  @update:model-value="
                    validateNumberValue(
                      authTokenConfig.fields.refresh_token_validity
                    )
                  "
                />
              </div>
              <div class="flex flex-col space-y-2">
                <label>{{
                  t('configs.auth_providers.token.access_token_validity')
                }}</label>
                <HoppSmartInput
                  v-model="authTokenConfig.fields.access_token_validity"
                  placeholder="e.g., 86400000 (in milliseconds)"
                  :autofocus="false"
                  class="!my-2 !bg-primaryLight flex-1"
                  type="number"
                  @update:model-value="
                    validateNumberValue(
                      authTokenConfig.fields.access_token_validity
                    )
                  "
                />
              </div>
              <div class="flex flex-col space-y-2">
                <label>{{
                  t('configs.auth_providers.token.session_secret')
                }}</label>
                <HoppSmartInput
                  v-model="authTokenConfig.fields.session_secret"
                  placeholder="e.g., your-session-secret"
                  :autofocus="false"
                  input-styles="!border-0 "
                  class="!my-2 !bg-primaryLight flex-1 border border-divider rounded"
                  :type="isMasked('session_secret') ? 'password' : 'text'"
                >
                  <template #button>
                    <HoppButtonSecondary
                      :icon="isMasked('session_secret') ? IconEye : IconEyeOff"
                      class="bg-primaryLight rounded"
                      @click="toggleMask('session_secret')"
                    />
                  </template>
                </HoppSmartInput>
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
import { computed, ref } from 'vue';
import { useI18n } from '~/composables/i18n';
import { ServerConfigs } from '~/helpers/configs';
import IconHelpCircle from '~icons/lucide/help-circle';
import IconEye from '~icons/lucide/eye';
import IconEyeOff from '~icons/lucide/eye-off';
import { useToast } from '~/composables/toast';

const t = useI18n();
const toast = useToast();

const props = defineProps<{
  config: ServerConfigs;
}>();

const emit = defineEmits<{
  (e: 'update:config', v: ServerConfigs): void;
}>();

const workingConfigs = useVModel(props, 'config', emit);

// Get or set token from workingConfigs
const authTokenConfig = computed({
  get: () => workingConfigs.value?.tokenConfigs,
  set: (value) => (workingConfigs.value.tokenConfigs = value),
});

const maskState = ref<Record<string, boolean>>({
  jwt_secret: true,
  session_secret: true,
});

const toggleMask = (fieldKey: string) => {
  maskState.value[fieldKey] = !maskState.value[fieldKey];
};

const isMasked = (fieldKey: string) => maskState.value[fieldKey];

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
