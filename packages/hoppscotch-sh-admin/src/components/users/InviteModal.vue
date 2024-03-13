<template>
  <HoppSmartModal
    v-if="show"
    dialog
    :title="t('users.invite_user')"
    @close="emit('hide-modal')"
  >
    <template #body>
      <HoppSmartInput
        v-model="email"
        :label="t('users.email_address')"
        input-styles="floating-input"
        @submit="sendInvite"
      />
    </template>
    <template #footer>
      <span class="flex space-x-2">
        <HoppButtonPrimary
          :label="t('users.send_invite')"
          @click="sendInvite"
        />
        <HoppButtonSecondary
          :label="t('users.cancel')"
          outline
          filled
          @click="hideModal"
        />
      </span>
    </template>
  </HoppSmartModal>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from '~/composables/i18n';
import { useToast } from '~/composables/toast';

const t = useI18n();
const toast = useToast();

withDefaults(
  defineProps<{
    show: boolean;
  }>(),
  {
    show: false,
  }
);

const emit = defineEmits<{
  (event: 'hide-modal'): void;
  (event: 'send-invite', email: string): void;
}>();

const email = ref('');

const sendInvite = () => {
  if (email.value.trim() === '') {
    toast.error(t('users.valid_email'));
    return;
  }
  emit('send-invite', email.value);
};

const hideModal = () => {
  emit('hide-modal');
};
</script>
