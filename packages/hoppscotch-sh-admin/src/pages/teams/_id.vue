<template>
  <div class="flex flex-col">
    <div v-if="fetching" class="flex justify-center">
      <HoppSmartSpinner />
    </div>

    <div v-else-if="error">{{ t('teams.load_info_error') }}</div>

    <div v-if="team" class="flex flex-col">
      <div class="flex items-center space-x-4">
        <button
          class="p-2 rounded-3xl bg-divider hover:bg-dividerDark transition flex justify-center items-center"
          @click="router.push('/teams')"
        >
          <icon-lucide-arrow-left class="text-xl" />
        </button>
        <div class="flex justify-center items-center space-x-3">
          <h1 class="text-lg text-accentContrast">
            {{ team.name }}
          </h1>
          <span>/</span>
          <h2 class="text-lg text-accentContrast">
            {{ currentTabName }}
          </h2>
        </div>
      </div>

      <div class="py-8">
        <HoppSmartTabs v-model="selectedOptionTab" render-inactive-tabs>
          <HoppSmartTab :id="'details'" :label="t('teams.details')">
            <TeamsDetails
              v-model:team="team"
              :teamName="teamName"
              v-model:showRenameInput="showRenameInput"
              @rename-team="renameTeamName"
              @delete-team="deleteTeam"
              class="py-8 px-4"
            />
          </HoppSmartTab>
          <HoppSmartTab :id="'members'" :label="t('teams.team_members')">
            <TeamsMembers v-model:team="team" class="py-8 px-4" />
          </HoppSmartTab>
          <HoppSmartTab :id="'invites'" :label="t('teams.invites')">
            <TeamsPendingInvites :editingTeamID="team.id" />
          </HoppSmartTab>
        </HoppSmartTabs>

        <HoppSmartConfirmModal
          :show="confirmDeletion"
          :title="t('teams.confirm_team_deletion')"
          @hide-modal="confirmDeletion = false"
          @resolve="deleteTeamMutation(deleteTeamUID)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useMutation } from '@urql/vue';
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from '~/composables/toast';
import {
  RemoveTeamDocument,
  RenameTeamDocument,
  TeamInfoDocument,
  TeamMemberRole,
  TeamInfoQuery,
} from '../../helpers/backend/graphql';
import { HoppSmartTabs } from '@hoppscotch/ui';
import { useI18n } from '~/composables/i18n';
import { useClientHandler } from '~/composables/useClientHandler';

const t = useI18n();

const toast = useToast();

type OptionTabs = 'details' | 'members' | 'invites';

const selectedOptionTab = ref<OptionTabs>('details');

const currentTabName = computed(() => {
  switch (selectedOptionTab.value) {
    case 'details':
      return t('teams.team_details');
    case 'members':
      return t('teams.team_members_tab');
    case 'invites':
      return t('teams.pending_invites');
    default:
      return '';
  }
});

const route = useRoute();

const {
  fetching,
  fetchData: getTeamInfo,
  fetchedData: teamInfo,
  error,
} = useClientHandler(TeamInfoDocument, {
  teamID: route.params.id.toString(),
});

const team = ref<TeamInfoQuery['infra']['teamInfo'] | undefined>();
const teamName = computed(() => team.value?.name ?? '');

onMounted(async () => {
  await getTeamInfo();
  team.value = teamInfo.value?.infra.teamInfo;
});

// Rename the team name
const showRenameInput = ref(false);
const teamRename = useMutation(RenameTeamDocument);

const renameTeamName = async (teamName: string) => {
  if (!team.value) return;

  if (team.value.name === teamName) {
    showRenameInput.value = false;
    return;
  }
  const variables = { uid: team.value.id, name: teamName };
  await teamRename.executeMutation(variables).then((result) => {
    if (result.error) {
      toast.error(`${t('state.rename_team_failure')}`);
    } else {
      showRenameInput.value = false;
      if (team.value) {
        team.value.name = teamName;
        toast.success(`${t('state.rename_team_success')}`);
      }
    }
  });
};

// Delete team from the infra
const router = useRouter();
const confirmDeletion = ref(false);
const teamDeletion = useMutation(RemoveTeamDocument);
const deleteTeamUID = ref<string | null>(null);

const deleteTeam = (id: string) => {
  confirmDeletion.value = true;
  deleteTeamUID.value = id;
};

const deleteTeamMutation = async (id: string | null) => {
  if (!id) {
    confirmDeletion.value = false;
    toast.error(`${t('state.delete_team_failure')}`);
    return;
  }
  const variables = { uid: id };
  await teamDeletion.executeMutation(variables).then((result) => {
    if (result.error) {
      toast.error(`${t('state.delete_team_failure')}`);
    } else {
      toast.success(`${t('state.delete_team_success')}`);
    }
  });
  confirmDeletion.value = false;
  deleteTeamUID.value = null;
  router.push('/teams');
};

// Update Roles of Members
const roleUpdates = ref<
  {
    userID: string;
    role: TeamMemberRole;
  }[]
>([]);

watch(
  () => team.value,
  (teamDetails) => {
    const members = teamDetails?.teamMembers ?? [];

    // Remove deleted members
    roleUpdates.value = roleUpdates.value.filter(
      (update) =>
        members.findIndex(
          (y: { user: { uid: string } }) => y.user.uid === update.userID
        ) !== -1
    );
  }
);
</script>
