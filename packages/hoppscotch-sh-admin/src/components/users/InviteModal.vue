<template>
  <HoppSmartModal
    v-if="show"
    dialog
    :title="t('users.invite_user')"
    @close="$emit('hide-modal')"
  >
    <template #body>
      <HoppSmartInput
        v-model="email"
        :label="t('users.email_address')"
        input-styles="floating-input"
      />
    </template>
    <template #footer>
      <span class="flex space-x-2">
        <HoppButtonPrimary
          :label="t('users.send_invite')"
          :loading="loadingState"
          @click="sendInvite"
        />
        <HoppButtonSecondary label="Cancel" outline filled @click="hideModal" />
      </span>
    </template>
  </HoppSmartModal>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useToast } from '~/composables/toast';
import { useI18n } from '~/composables/i18n';

const t = useI18n();

const toast = useToast();

withDefaults(
  defineProps<{
    show: boolean;
    loadingState: boolean;
  }>(),
  {
    show: false,
    loadingState: false,
  }
);

const emit = defineEmits<{
  (event: 'hide-modal'): void;
  (event: 'send-invite', email: string): void;
}>();

const email = ref('');

const sendInvite = () => {
  if (email.value.trim() === '') {
    toast.error(`${t('users.valid_email')}`);
    return;
  }
  emit('send-invite', email.value);
};

const hideModal = () => {
  emit('hide-modal');
};
</script>
