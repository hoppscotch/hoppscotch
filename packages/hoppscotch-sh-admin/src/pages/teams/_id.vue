<template>
  <div class="flex flex-col">
    <div v-if="fetching" class="flex justify-center">
      <HoppSmartSpinner />
    </div>

    <div v-else-if="error" class="text-lg">
      {{ t('teams.load_info_error') }}
    </div>

    <div v-else-if="team" class="flex flex-col">
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
              @delete-team="deleteTeam"
              class="py-8 px-4"
            />
          </HoppSmartTab>
          <HoppSmartTab :id="'members'" :label="t('teams.team_members')">
            <TeamsMembers v-model:team="team" class="py-8 px-4" />
          </HoppSmartTab>
          <HoppSmartTab :id="'invites'" :label="t('teams.invites')">
            <TeamsPendingInvites v-model:team="team" />
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
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from '~/composables/i18n';
import { useToast } from '~/composables/toast';
import { useClientHandler } from '~/composables/useClientHandler';
import {
  RemoveTeamDocument,
  TeamInfoDocument,
  TeamInfoQuery,
} from '../../helpers/backend/graphql';

const t = useI18n();
const toast = useToast();
const route = useRoute();
const router = useRouter();

// Tabs
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

// Get Team Info
const {
  fetching,
  error,
  data: teamInfo,
  fetchData: getTeamInfo,
} = useClientHandler(TeamInfoDocument, {
  teamID: route.params.id.toString(),
});

const team = ref<TeamInfoQuery['infra']['teamInfo'] | undefined>();

onMounted(async () => {
  await getTeamInfo();
  team.value = teamInfo.value?.infra.teamInfo;
});

// Delete team from the infra
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
    toast.error(t('state.delete_team_failure'));
    return;
  }
  const variables = { uid: id };
  const result = await teamDeletion.executeMutation(variables);
  if (result.error) {
    toast.error(t('state.delete_team_failure'));
  } else {
    toast.success(t('state.delete_team_success'));
  }
  confirmDeletion.value = false;
  deleteTeamUID.value = null;
  router.push('/teams');
};
</script>
