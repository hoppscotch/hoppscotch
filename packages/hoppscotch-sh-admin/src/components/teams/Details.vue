<template>
  <div class="flex flex-col">
    <div class="flex flex-col space-y-8">
      <div v-if="team.id" class="flex flex-col space-y-3">
        <label class="text-accentContrast" for="username">Team ID</label>
        <div class="w-full p-3 bg-divider rounded-md">
          {{ team.id }}
        </div>
      </div>

      <div v-if="teamName" class="flex flex-col space-y-3">
        <label class="text-accentContrast" for="teamname">Team Name </label>
        <div
          class="flex bg-divider rounded-md items-stretch flex-1 border border-divider"
          :class="{
            '!border-accent': showRenameInput,
          }"
        >
          <input
            class="bg-transparent flex-1 p-3 rounded-md !rounded-r-none disabled:select-none border-r-0 disabled:cursor-default disabled:opacity-50"
            type="text"
            v-model="newTeamName"
            placeholder="Team Name"
            autofocus
            :disabled="!showRenameInput"
            v-focus
          />
          <HoppButtonPrimary
            class="!rounded-l-none"
            filled
            :icon="showRenameInput ? IconSave : IconEdit"
            :label="showRenameInput ? 'Rename' : 'Edit'"
            @click="handleNameEdit()"
          />
        </div>
      </div>

      <div v-if="team.teamMembers.length" class="flex flex-col space-y-3">
        <label class="text-accentContrast" for="username"
          >Number of Members</label
        >
        <div class="w-full p-3 bg-divider rounded-md">
          {{ team.teamMembers.length }}
        </div>
      </div>
    </div>

    <div class="flex justify-start mt-8">
      <HoppButtonPrimary
        class="!bg-red-600 !hover:opacity-80"
        filled
        label="Delete Team"
        @click="team && $emit('delete-team', team.id)"
        :icon="IconTrash"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useToast } from '~/composables/toast';
import { TeamInfoQuery } from '~/helpers/backend/graphql';
import IconEdit from '~icons/lucide/edit';
import IconSave from '~icons/lucide/save';
import IconTrash from '~icons/lucide/trash-2';

const toast = useToast();

const props = defineProps<{
  team: TeamInfoQuery['admin']['teamInfo'];
  teamName: string;
  showRenameInput: boolean;
}>();

const emit = defineEmits<{
  (event: 'delete-team', teamID: string): void;
  (event: 'rename-team', teamName: string): void;
  (event: 'update:showRenameInput', showRenameInput: boolean): void;
}>();

const newTeamName = ref(props.teamName);

const handleNameEdit = () => {
  if (props.showRenameInput) {
    renameTeam();
  } else {
    emit('update:showRenameInput', true);
  }
};

const renameTeam = () => {
  if (newTeamName.value.trim() === '') {
    toast.error('Team name cannot be empty');
    return;
  }
  emit('rename-team', newTeamName.value);
};
</script>
