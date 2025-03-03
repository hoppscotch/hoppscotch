<template>
  <HoppSmartModal
    v-if="show"
    dialog
    :title="t('teams.create_team')"
    @close="emit('hide-modal')"
  >
    <template #body>
      <div class="flex flex-col space-y-4 relative">
        <div class="flex flex-col relative">
          <label for="teamName" class="py-2"> {{ t('teams.email') }} </label>
          <HoppSmartAutoComplete
            type="email"
            :value="ownerEmail"
            styles="w-full p-2 bg-transparent border border-divider rounded-md"
            class="flex-1 !flex"
            :source="allUsersEmail"
            :spellcheck="true"
            :placeholder="t('teams.email')"
            @input="(email: string) => getOwnerEmail(email)"
          />
        </div>
        <label for="teamName"> {{ t('teams.name') }} </label>
        <HoppSmartInput
          v-model="teamName"
          :placeholder="t('teams.name')"
          class="!my-2"
        />
      </div>
    </template>
    <template #footer>
      <span class="flex space-x-2">
        <HoppButtonPrimary
          :label="t('teams.create_team')"
          :loading="loadingState"
          @click="createTeam"
        />
        <HoppButtonSecondary
          :label="t('teams.cancel')"
          outline
          filled
          @click="hideModal"
        />
      </span>
    </template>
  </HoppSmartModal>
</template>

<script setup lang="ts">
import { ref, watchEffect } from 'vue';
import { useI18n } from '~/composables/i18n';
import { useToast } from '~/composables/toast';

const t = useI18n();
const toast = useToast();

const props = withDefaults(
  defineProps<{
    show: boolean;
    loadingState: boolean;
    allUsersEmail: string[];
  }>(),
  {
    show: false,
    loadingState: false,
  }
);

const emit = defineEmits<{
  (event: 'hide-modal'): void;
  (event: 'create-team', teamName: string, ownerEmail: string): void;
}>();

const teamName = ref('');
const ownerEmail = ref('');

watchEffect(() => {
  if (!props.show) {
    teamName.value = '';
    ownerEmail.value = '';
  }
});

const getOwnerEmail = (email: string) => (ownerEmail.value = email);

const createTeam = () => {
  if (teamName.value.trim() === '') {
    toast.error(t('teams.valid_name'));
    return;
  }
  if (ownerEmail.value.trim() === '') {
    toast.error(t('teams.valid_owner_email'));
    return;
  }
  emit('create-team', teamName.value, ownerEmail.value);
};

const hideModal = () => {
  emit('hide-modal');
};
</script>
