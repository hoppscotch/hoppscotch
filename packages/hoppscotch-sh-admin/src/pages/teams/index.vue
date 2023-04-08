<template>
  <div class="flex flex-col">
    <h1 class="text-lg font-bold text-secondaryDark">Teams</h1>

    <div class="flex flex-col">
      <div class="flex py-10">
        <HoppButtonPrimary
          :icon="IconAddUsers"
          label="Create team"
          @click="showCreateTeamModal = true"
        />
      </div>

      <div class="overflow-x-auto">
        <div
          v-if="fetching && !error && teamList.length === 0"
          class="flex justify-center"
        >
          <HoppSmartSpinner />
        </div>

        <div v-else-if="error">Unable to Load Teams List..</div>

        <TeamsTable
          v-else
          :teamList="teamList"
          @goToTeamDetails="goToTeamDetails"
          @deleteTeam="deleteTeam"
          class=""
        />

        <div
          v-if="hasNextPage && teamList.length >= teamsPerPage"
          class="flex justify-center my-5 px-3 py-2 cursor-pointer font-semibold rounded-3xl bg-dividerDark hover:bg-divider transition mx-auto w-38 text-secondaryDark"
          @click="fetchNextTeams"
        >
          <span>Show more </span>
          <icon-lucide-chevron-down class="ml-2 text-lg" />
        </div>
      </div>
    </div>
  </div>

  <TeamsAdd
    :show="showCreateTeamModal"
    :allUsersEmail="allUsersEmail"
    :loading-state="createTeamLoading"
    @hide-modal="showCreateTeamModal = false"
    @create-team="createTeam"
  />
  <HoppSmartConfirmModal
    :show="confirmDeletion"
    :title="`Confirm Deletion of the team?`"
    @hide-modal="confirmDeletion = false"
    @resolve="deleteTeamMutation(deleteTeamID)"
  />
</template>

<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router';
import {
  CreateTeamDocument,
  MetricsDocument,
  RemoveTeamDocument,
  TeamListDocument,
  UsersListDocument,
} from '../../helpers/backend/graphql';
import { usePagedQuery } from '../../composables/usePagedQuery';
import { ref, watch, computed } from 'vue';
import { useMutation, useQuery } from '@urql/vue';
import { useToast } from '../../composables/toast';
import IconAddUsers from '~icons/lucide/plus';

const toast = useToast();
// Get Users List
const { data } = useQuery({ query: MetricsDocument });
const usersPerPage = computed(() => data.value?.admin.usersCount || 10000);

const { list: usersList } = usePagedQuery(
  UsersListDocument,
  (x) => x.admin.allUsers,
  (x) => x.uid,
  usersPerPage.value,
  { cursor: undefined, take: usersPerPage.value }
);

const allUsersEmail = computed(() => usersList.value.map((user) => user.email));

// Get Paginated Results of all the teams in the infra
const teamsPerPage = 20;
const {
  fetching,
  error,
  goToNextPage: fetchNextTeams,
  refetch,
  list: teamList,
  hasNextPage,
} = usePagedQuery(
  TeamListDocument,
  (x) => x.admin.allTeams,
  (x) => x.id,
  teamsPerPage,
  { cursor: undefined, take: teamsPerPage }
);

// Create Team
const createTeamMutation = useMutation(CreateTeamDocument);
const showCreateTeamModal = ref(false);
const createTeamLoading = ref(false);

const createTeam = async (newTeamName: string, ownerEmail: string) => {
  if (newTeamName.length < 6) {
    toast.error('Team name should be atleast 6 characters long!!');
    return;
  }
  if (ownerEmail.length == 0) {
    toast.error('Please enter email of team owner!!');
    return;
  }
  createTeamLoading.value = true;
  const userUid =
    usersList.value.find((user) => user.email === ownerEmail)?.uid || '';
  const variables = { name: newTeamName.trim(), userUid: userUid };
  await createTeamMutation.executeMutation(variables).then((result) => {
    if (result.error) {
      if (result.error.toString() == '[GraphQL] user/not_found') {
        toast.error('User not found!!');
      } else {
        toast.error('Failed to create team!!');
      }
      createTeamLoading.value = false;
    } else {
      toast.success('Team created successfully!!');
      showCreateTeamModal.value = false;
      createTeamLoading.value = false;
      refetch();
    }
  });
};

// Go To Individual Team Details Page
const router = useRouter();
const goToTeamDetails = (teamId: string) => {
  router.push('/teams/' + teamId);
};

// Reload Teams Page when routed back to the teams page
const route = useRoute();
watch(
  () => route.params.id,
  () => window.location.reload()
);

// Team Deletion
const teamDeletion = useMutation(RemoveTeamDocument);
const confirmDeletion = ref(false);
const deleteTeamID = ref<string | null>(null);

const deleteTeam = (id: string) => {
  confirmDeletion.value = true;
  deleteTeamID.value = id;
};

const deleteTeamMutation = async (id: string | null) => {
  if (!id) {
    confirmDeletion.value = false;
    toast.error('Team deletion failed!!');
    return;
  }
  const variables = { uid: id };
  await teamDeletion.executeMutation(variables).then((result) => {
    if (result.error) {
      toast.error('Team deletion failed!!');
    } else {
      teamList.value = teamList.value.filter((team) => team.id !== id);
      toast.success('Team deleted successfully!!');
    }
  });
  confirmDeletion.value = false;
  deleteTeamID.value = null;
  router.push('/teams');
};
</script>
