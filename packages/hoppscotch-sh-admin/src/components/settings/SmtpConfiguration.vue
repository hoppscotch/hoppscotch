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
            <div>
              <label> {{ t('configs.mail_configs.smtp_url') }} </label>
              <span class="flex">
                <HoppSmartInput
                  v-model="smtpConfigs.fields.mailer_smtp_url"
                  :type="isMailerSmtpUrlMasked ? 'password' : 'text'"
                  :disabled="isMailerSmtpUrlMasked"
                  :autofocus="false"
                  class="!my-2 !bg-primaryLight"
                />
                <HoppButtonSecondary
                  :icon="isMailerSmtpUrlMasked ? IconEye : IconEyeOff"
                  class="bg-primaryLight h-9 mt-2"
                  @click="toggleSMTPUrlMask"
                />
              </span>
            </div>

            <div class="mt-5">
              <label>
                {{ t('configs.mail_configs.address_from') }}
              </label>
              <span class="flex">
                <HoppSmartInput
                  v-model="smtpConfigs.fields.mailer_from_address"
                  :type="isMailerFromAddressMasked ? 'password' : 'text'"
                  :disabled="isMailerFromAddressMasked"
                  :autofocus="false"
                  class="!my-2 !bg-primaryLight"
                />
                <HoppButtonSecondary
                  :icon="isMailerFromAddressMasked ? IconEye : IconEyeOff"
                  class="bg-primaryLight h-9 mt-2"
                  @click="toggleMailerFromAddressMask"
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
import { computed, reactive } from 'vue';
import { useVModel } from '@vueuse/core';
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

// Extract mail configs from working configs
const smtpConfigs = computed({
  get() {
    return workingConfigs.value?.mailConfigs;
  },
  set(value) {
    workingConfigs.value.mailConfigs = value;
  },
});

// Mask fields of mail configs
const maskFields = reactive({
  mailer_smtp_url: true,
  mailer_from_address: true,
});

const isMailerSmtpUrlMasked = computed(() => maskFields.mailer_smtp_url);
const isMailerFromAddressMasked = computed(
  () => maskFields.mailer_from_address
);

const toggleSMTPUrlMask = () =>
  (maskFields.mailer_smtp_url = !maskFields.mailer_smtp_url);
const toggleMailerFromAddressMask = () =>
  (maskFields.mailer_from_address = !maskFields.mailer_from_address);
</script>
