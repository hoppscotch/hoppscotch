<template>
  <div class="flex flex-col">
    <div class="flex flex-col space-y-8">
      <div v-if="team.id" class="flex flex-col space-y-3">
        <label class="text-accentContrast" for="username"
          >{{ t('teams.id') }}
        </label>
        <div class="w-full p-3 bg-divider rounded-md">
          {{ team.id }}
        </div>
      </div>

      <div v-if="teamName" class="flex flex-col space-y-3">
        <label class="text-accentContrast" for="teamname"
          >{{ t('teams.name') }}
        </label>
        <div
          class="flex bg-divider rounded-md items-stretch flex-1 border border-divider"
          :class="{
            '!border-accent': showRenameInput,
          }"
        >
          <HoppSmartInput
            v-model="newTeamName"
            styles="bg-transparent flex-1 rounded-md !rounded-r-none disabled:select-none border-r-0 disabled:cursor-default disabled:opacity-50"
            placeholder="Team Name"
            :disabled="!showRenameInput"
          >
            <template #button>
              <HoppButtonPrimary
                class="!rounded-l-none"
                filled
                :icon="showRenameInput ? IconSave : IconEdit"
                :label="
                  showRenameInput
                    ? `${t('teams.rename')}`
                    : `${t('teams.edit')}`
                "
                @click="handleNameEdit()"
              />
            </template>
          </HoppSmartInput>
        </div>
      </div>

      <div v-if="team.teamMembers.length" class="flex flex-col space-y-3">
        <label class="text-accentContrast" for="username"
          >{{ t('teams.members') }}
        </label>
        <div class="w-full p-3 bg-divider rounded-md">
          {{ team.teamMembers.length }}
        </div>
      </div>
    </div>

    <div class="flex justify-start mt-8">
      <HoppButtonPrimary
        class="!bg-red-600 !hover:opacity-80"
        filled
        :label="t('teams.delete_team')"
        @click="team && $emit('delete-team', team.id)"
        :icon="IconTrash"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useToast } from '~/composables/toast';
import { TeamInfoQuery } from '~/helpers/backend/graphql';
import IconEdit from '~icons/lucide/edit';
import IconSave from '~icons/lucide/save';
import IconTrash from '~icons/lucide/trash-2';
import { useI18n } from '~/composables/i18n';

const t = useI18n();

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
    toast.error(`${t('teams.empty_name')}`);
    return;
  }
  emit('rename-team', newTeamName.value);
};
</script>
