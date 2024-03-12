<template>
  <div
    v-if="smtpConfigs"
    class="md:grid md:grid-cols-3 md:gap-4 border-divider border-b"
  >
    <div class="p-8 px-8 md:col-span-1">
      <h3 class="heading">{{ t('configs.mail_configs.title') }}</h3>
      <p class="my-1 text-secondaryLight">
        {{ t('configs.mail_configs.description') }}
      </p>
    </div>

    <div class="space-y-8 p-8 md:col-span-2">
      <section>
        <h4 class="font-semibold text-secondaryDark">
          {{ t('configs.mail_configs.title') }}
        </h4>

        <div class="space-y-4 py-4">
          <div class="flex items-center">
            <HoppSmartToggle
              :on="smtpConfigs.enabled"
              @change="smtpConfigs.enabled = !smtpConfigs.enabled"
            >
              {{ t('configs.mail_configs.enable') }}
            </HoppSmartToggle>
          </div>

          <div v-if="smtpConfigs.enabled" class="ml-12">
            <div
              v-for="field in smtpConfigFields"
              :key="field.key"
              class="mt-5"
            >
              <label>{{ field.name }}</label>
              <span class="flex max-w-lg">
                <HoppSmartInput
                  v-model="smtpConfigs.fields[field.key]"
                  :type="isMasked(field.key) ? 'password' : 'text'"
                  :autofocus="false"
                  class="!my-2 !bg-primaryLight flex-1"
                />
                <HoppButtonSecondary
                  :icon="isMasked(field.key) ? IconEye : IconEyeOff"
                  class="bg-primaryLight h-9 mt-2"
                  @click="toggleMask(field.key)"
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
import { useVModel } from '@vueuse/core';
import { computed, reactive } from 'vue';
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

// Get or set smtpConfigs from workingConfigs
const smtpConfigs = computed({
  get() {
    return workingConfigs.value?.mailConfigs;
  },
  set(value) {
    workingConfigs.value.mailConfigs = value;
  },
});

// Mask sensitive fields
type Field = {
  name: string;
  key: keyof Config['mailConfigs']['fields'];
};

const smtpConfigFields = reactive<Field[]>([
  { name: t('configs.mail_configs.smtp_url'), key: 'mailer_smtp_url' },
  { name: t('configs.mail_configs.address_from'), key: 'mailer_from_address' },
]);

const maskState = reactive<Record<string, boolean>>({
  mailer_smtp_url: true,
  mailer_from_address: true,
});

const toggleMask = (fieldKey: keyof Config['mailConfigs']['fields']) => {
  maskState[fieldKey] = !maskState[fieldKey];
};

const isMasked = (fieldKey: keyof Config['mailConfigs']['fields']) =>
  maskState[fieldKey];
</script>
