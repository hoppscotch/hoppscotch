<template>
  <HoppSmartModal
    dialog
    :title="t('users.new_user_added')"
    @close="inviteSuccessModal = false"
  >
    <template #body>
      <icon-lucide-check
        class="text-4xl text-emerald-500 w-min mx-auto my-3 p-3 bg-primaryDark rounded-full"
      />
      <p class="text-center my-2">
        {{
          smtpEnabled
            ? t('state.login_using_email')
            : t('state.login_using_link')
        }}
      </p>
      <div class="flex p-3 mx-10">
        <input
          :value="baseURL"
          class="input rounded-r-none"
          placeholder=""
          type="text"
          autocomplete="off"
          disabled
        />
        <div class="bg-primaryDark rounded-r-sm">
          <UiAutoResetIcon
            :title="t('users.copy_link')"
            :icon="{ default: IconCopy, temporary: IconCheck }"
            @click="emit('copy-invite-link')"
          />
        </div>
      </div>
    </template>
  </HoppSmartModal>
</template>

<script setup lang="ts">
import { useVModel } from '@vueuse/core';
import { useI18n } from '~/composables/i18n';

import IconCheck from '~icons/lucide/check';
import IconCopy from '~icons/lucide/copy';

const t = useI18n();

const props = defineProps<{
  baseURL: string;
  inviteSuccess: boolean;
  smtpEnabled: boolean;
}>();

const emit = defineEmits<{
  (event: 'copy-invite-link'): void;
  (event: 'update:inviteSuccess', v: boolean): void;
}>();

const inviteSuccessModal = useVModel(props, 'inviteSuccess', emit);
</script>
