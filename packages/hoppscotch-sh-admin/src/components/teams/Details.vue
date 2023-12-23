<template>
  <div v-if="team" class="flex flex-col">
    <div class="flex flex-col space-y-8">
      <div class="flex flex-col space-y-3">
        <label class="text-accentContrast" for="username"
          >{{ t('teams.id') }}
        </label>
        <div class="w-full p-3 bg-divider rounded-md">
          {{ team.id }}
        </div>
      </div>

      <div class="flex flex-col space-y-3">
        <label class="text-accentContrast" for="teamname"
          >{{ t('teams.name') }}
        </label>
        <div
          class="flex bg-divider rounded-md items-stretch flex-1 border border-divider"
          :class="{
            '!border-accent': isTeamNameBeingEdited,
          }"
        >
          <HoppSmartInput
            v-model="updatedTeamName"
            styles="bg-transparent flex-1 rounded-md !rounded-r-none disabled:select-none border-r-0 disabled:cursor-default disabled:opacity-50"
            placeholder="Team Name"
            :disabled="!isTeamNameBeingEdited"
          >
            <template #button>
              <HoppButtonPrimary
                class="!rounded-l-none"
                filled
                :icon="isTeamNameBeingEdited ? IconSave : IconEdit"
                :label="
                  isTeamNameBeingEdited
                    ? `${t('teams.rename')}`
                    : `${t('teams.edit')}`
                "
                @click="handleTeamNameEdit"
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
        @click="emit('delete-team', team.id)"
        :icon="IconTrash"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useMutation } from '@urql/vue';
import { useVModel } from '@vueuse/core';
import { computed, onMounted, ref } from 'vue';
import { useI18n } from '~/composables/i18n';
import { useToast } from '~/composables/toast';
import { RenameTeamDocument, TeamInfoQuery } from '~/helpers/backend/graphql';
import IconEdit from '~icons/lucide/edit';
import IconSave from '~icons/lucide/save';
import IconTrash from '~icons/lucide/trash-2';

const t = useI18n();
const toast = useToast();

const props = defineProps<{
  team: TeamInfoQuery['infra']['teamInfo'];
}>();

const emit = defineEmits<{
  (event: 'update:team', team: TeamInfoQuery['infra']['teamInfo']): void;
  (event: 'delete-team', teamId: string): void;
}>();

const team = useVModel(props, 'team', emit);

// Contains the actual team name
const teamName = computed({
  get: () => team.value.name,
  set: (value) => {
    team.value.name = value;
  },
});

// Contains the stored team name from the actual team name before being edited
const currentTeamName = ref('');

// Contains the team name that is being edited
const updatedTeamName = computed({
  get: () => currentTeamName.value,
  set: (value) => {
    currentTeamName.value = value;
  },
});

// Set the current team name to the actual team name
onMounted(() => {
  currentTeamName.value = teamName.value;
});

// Rename the team name
const isTeamNameBeingEdited = ref(false);
const teamRename = useMutation(RenameTeamDocument);

const handleTeamNameEdit = () => {
  if (isTeamNameBeingEdited.value) {
    // If the team name is not changed, then return control
    if (teamName.value !== updatedTeamName.value) {
      renameTeamName();
    } else isTeamNameBeingEdited.value = false;
  } else {
    isTeamNameBeingEdited.value = true;
  }
};

const renameTeamName = async () => {
  if (updatedTeamName.value.trim() === '') {
    toast.error(t('teams.empty_name'));
    return;
  }

  if (updatedTeamName.value.length < 6) {
    toast.error(t('state.team_name_too_short'));
    return;
  }

  const variables = { uid: team.value.id, name: updatedTeamName.value };
  const result = await teamRename.executeMutation(variables);

  if (result.error) {
    toast.error(t('state.rename_team_failure'));
  } else {
    isTeamNameBeingEdited.value = false;
    toast.success(t('state.rename_team_success'));
    teamName.value = updatedTeamName.value;
  }
};
</script>
