<template>
  <HoppSmartModal
    v-if="show"
    dialog
    title="Create team"
    @close="$emit('hide-modal')"
  >
    <template #body>
      <div class="flex flex-col space-y-4 relative">
        <div class="flex flex-col relaive">
          <label for="teamName" class="py-2"> Team owner email </label>
          <HoppSmartAutoComplete
            styles="w-full p-2 bg-transparent border border-divider rounded-md "
            class="flex-1 !flex"
            :source="allUsersEmail"
            :spellcheck="true"
            placeholder=""
            @input="(email: string) => getOwnerEmail(email)"
          />
        </div>
        <div class="flex flex-col">
          <label for="teamName" class="py-2">Team name</label>
          <input
            id="teamName"
            v-model="teamName"
            v-focus
            class="input relative"
            placeholder=""
            type="email"
            autocomplete="off"
          />
        </div>
      </div>
    </template>
    <template #footer>
      <span class="flex space-x-2">
        <HoppButtonPrimary
          label="Create team"
          :loading="loadingState"
          @click="createTeam"
        />
        <HoppButtonSecondary label="Cancel" outline filled @click="hideModal" />
      </span>
    </template>
  </HoppSmartModal>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useToast } from '~/composables/toast';

const toast = useToast();

withDefaults(
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

const getOwnerEmail = (email: string) => (ownerEmail.value = email);

const createTeam = () => {
  if (teamName.value.trim() === '') {
    toast.error('Please enter a valid team name');
    return;
  }
  if (ownerEmail.value.trim() === '') {
    toast.error('Please enter a valid owner email');
    return;
  }
  emit('create-team', teamName.value, ownerEmail.value);
  teamName.value = '';
  ownerEmail.value = '';
};

const hideModal = () => {
  emit('hide-modal');
};
</script>
