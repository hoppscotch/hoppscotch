<template>
  <div
    v-if="mailConfigs"
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
              :on="mailConfigs.enabled"
              @change="mailConfigs.enabled = !mailConfigs.enabled"
            >
              {{ t('configs.mail_configs.enable') }}
            </HoppSmartToggle>
          </div>

          <div v-if="mailConfigs.enabled" class="ml-12">
            <div>
              <label> {{ t('configs.mail_configs.smtp_url') }} </label>
              <span class="flex">
                <HoppSmartInput
                  v-model="mailConfigs.fields.mailer_smtp_url"
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
                  v-model="mailConfigs.fields.mailer_address_from"
                  :type="isMailerAddressFromMasked ? 'password' : 'text'"
                  :disabled="isMailerAddressFromMasked"
                  :autofocus="false"
                  class="!my-2 !bg-primaryLight"
                />
                <HoppButtonSecondary
                  :icon="isMailerAddressFromMasked ? IconEye : IconEyeOff"
                  class="bg-primaryLight h-9 mt-2"
                  @click="toggleMailerAddressFromMask"
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
import { useI18n } from '~/composables/i18n';
import IconEye from '~icons/lucide/eye';
import IconEyeOff from '~icons/lucide/eye-off';
import { useVModel } from '@vueuse/core';
import { Configs } from '~/composables/useConfigHandler';
import { reactive, computed } from 'vue';

const t = useI18n();

const props = defineProps<{
  config: Configs;
}>();

const emit = defineEmits<{
  (e: 'update:config', v: Configs): void;
}>();

const workingConfigs = useVModel(props, 'config', emit);

const mailConfigs = computed({
  get() {
    return workingConfigs.value?.mailConfigs;
  },
  set(value) {
    workingConfigs.value.mailConfigs = value;
  },
});

const maskFields = reactive({
  email: {
    mailer_smtp_url: true,
    mailer_address_from: true,
  },
});

const isMailerSmtpUrlMasked = computed(() => maskFields.email.mailer_smtp_url);
const isMailerAddressFromMasked = computed(
  () => maskFields.email.mailer_address_from
);

const toggleSMTPUrlMask = () =>
  (maskFields.email.mailer_smtp_url = !maskFields.email.mailer_smtp_url);
const toggleMailerAddressFromMask = () =>
  (maskFields.email.mailer_address_from =
    !maskFields.email.mailer_address_from);
</script>
