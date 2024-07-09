<template>
  <HoppSmartModal
    dialog
    :title="t('users.invite_user')"
    @close="emit('hide-modal')"
  >
    <template #body>
      <HoppSmartInput
        v-model="email"
        :label="t('users.email_address')"
        input-styles="floating-input"
        @submit="emit('send-invite', email)"
      />
    </template>
    <template #footer>
      <span class="flex space-x-2">
        <HoppButtonPrimary
          :label="t('users.add_user')"
          @click="emit('send-invite', email)"
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

const t = useI18n();

const emit = defineEmits<{
  (event: 'hide-modal'): void;
  (event: 'send-invite', email: string): void;
  (event: 'copy-invite-link', email: string): void;
}>();

defineProps<{
  smtpEnabled: boolean;
}>();

const email = ref('');

const hideModal = () => {
  emit('hide-modal');
};
</script>
