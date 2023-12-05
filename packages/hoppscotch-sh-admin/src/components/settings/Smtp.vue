<template>
  <div class="md:grid md:grid-cols-3 md:gap-4 border-divider border-b">
    <div class="p-8 md:col-span-1">
      <h3 class="heading">SMTP Mail Configs</h3>
      <p class="my-1 text-secondaryLight">
        Configure the SMTP mail configs for your team.
      </p>
    </div>
    <div class="space-y-8 p-8 md:col-span-2">
      <section>
        <h4 class="font-semibold text-secondaryDark">Mail Configs</h4>
        <div class="space-y-4 py-4">
          <div>
            <div>
              <label for=""> Mail URL </label>
              <span class="flex">
                <HoppSmartInput
                  :type="mask_mail_url ? 'password' : 'text'"
                  :autofocus="false"
                  v-model="mail_url"
                  class="!my-2 !bg-primaryLight"
                />
                <HoppButtonSecondary
                  :icon="mask_mail_url ? IconEye : IconEyeOff"
                  class="bg-primaryLight h-9 mt-2"
                  @click="mask_mail_url = !mask_mail_url"
                />
              </span>
            </div>

            <div class="mt-5">
              <label for=""> Failure Address From </label>
              <span class="flex">
                <HoppSmartInput
                  :type="mask_failure_address ? 'password' : 'text'"
                  :autofocus="false"
                  v-model="failure_address"
                  class="!my-2 !bg-primaryLight"
                />
                <HoppButtonSecondary
                  :icon="mask_failure_address ? IconEye : IconEyeOff"
                  class="bg-primaryLight h-9 mt-2"
                  @click="mask_failure_address = !mask_failure_address"
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
import { ref } from 'vue';
import { useI18n } from '~/composables/i18n';
import IconEye from '~icons/lucide/eye';
import IconEyeOff from '~icons/lucide/eye-off';

const t = useI18n();

const googleAuth = ref(false);
const mail_url = ref('1234556787810');
const mask_mail_url = ref(true);
const failure_address = ref('1234556787810');
const mask_failure_address = ref(true);
</script>
