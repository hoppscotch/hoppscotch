<template>
  <div>
    <h3 class="sm:px-6 p-4 text-3xl font-bold text-gray-200">Teams</h3>

    <div class="flex flex-col">
      <div class="py-2 overflow-x-auto">
        <div class="inline-block min-w-full overflow-hidden align-middle">
          <div class="sm:px-7 p-4">
            <div class="flex w-full items-center mb-7">
              <HoppButtonPrimary
                class="mr-4"
                label="Create Team"
                @click="showCreateTeamModal = true"
              />
            </div>

            <div>
              <div
                v-if="fetching && !error && !(teamList.length >= 1)"
                class="flex justify-center"
              >
                <HoppSmartSpinner />
              </div>
              <div v-else-if="error">Unable to Load Teams List..</div>

              <table v-if="teamList.length >= 1" class="w-full text-left">
                <thead>
                  <tr
                    class="text-gray-200 border-b border-dividerDark text-sm font-bold"
                  >
                    <th class="px-3 pt-0 pb-3">Team ID</th>
                    <th class="px-3 pt-0 pb-3">Team Name</th>
                    <th class="px-3 pt-0 pb-3">Number of Members</th>
                    <th class="px-3 pt-0 pb-3"></th>
                  </tr>
                </thead>

                <tbody class="text-gray-300">
                  <tr
                    v-for="team in teamList"
                    :key="team.id"
                    class="border-b border-divider hover:bg-zinc-800 hover:cursor-pointer rounded-xl p-3"
                  >
                    <td
                      @click="goToTeamDetails(team.id)"
                      class="sm:p-3 py-5 px-1 min-w-30 max-w-50"
                    >
                      <div class="flex">
                        <span class="ml-3 truncate">
                          {{ team.id }}
                        </span>
                      </div>
                    </td>

                    <td
                      @click="goToTeamDetails(team.id)"
                      class="sm:p-3 py-5 px-1 min-w-80"
                    >
                      <span
                        v-if="team.name"
                        class="flex items-center ml-4 truncate"
                      >
                        {{ team.name }}
                      </span>
                      <span v-else class="flex items-center ml-4">
                        (Unnamed team)
                      </span>
                    </td>

                    <td
                      @click="goToTeamDetails(team.id)"
                      class="sm:p-3 py-5 px-1"
                    >
                      <span class="ml-7">
                        {{ team.members?.length }}
                      </span>
                    </td>

                    <td>
                      <div class="relative">
                        <tippy
                          interactive
                          trigger="click"
                          theme="popover"
                          :on-shown="() => tippyActions!.focus()"
                        >
                          <HoppButtonSecondary
                            v-tippy="{ theme: 'tooltip' }"
                            :icon="IconMoreHorizontal"
                          />
                          <template #content="{ hide }">
                            <div
                              ref="tippyActions"
                              class="flex flex-col focus:outline-none"
                              tabindex="0"
                              @keyup.escape="hide()"
                            >
                              <HoppSmartItem
                                :icon="IconTrash"
                                :label="'Delete Team'"
                                class="!hover:bg-red-600 w-full"
                                @click="deleteTeam(team.id)"
                              />
                            </div>
                          </template>
                        </tippy>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
              <div
                v-if="hasNextPage"
                class="flex justify-center mt-5 p-2 font-semibold rounded-3xl bg-zinc-800 hover:bg-zinc-700 mx-auto w-32 text-light-500"
                @click="fetchNextTeams"
              >
                <span>Show more </span>
                <icon-lucide-chevron-down class="ml-2 text-lg" />
              </div>
              <div v-else class="mb-12 p-2"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <HoppSmartModal
    v-if="showCreateTeamModal"
    dialog
    title="Create Team"
    @close="showCreateTeamModal = false"
  >
    <template #body>
      <div>
        <div>
          <div class="px-6 rounded-md">
            <div>
              <div class="my-4">
                <div>
                  <label class="text-gray-200" for="emailAddress">
                    Enter Team Name
                  </label>
                  <input
                    class="w-full p-3 mt-3 bg-zinc-800 border-gray-600 rounded-md focus:border-emerald-600 focus:ring focus:ring-opacity-40 focus:ring-emerald-500"
                    v-model="teamName"
                    placeholder="Team Name"
                  />
                </div>
              </div>
              <div class="my-6">
                <div>
                  <label class="text-gray-200" for="emailAddress">
                    Enter Email Address of Team Owner
                  </label>

                  <HoppSmartAutoComplete
                    placeholder="Enter Email"
                    :source="allUsersEmail"
                    :spellcheck="true"
                    styles="
                w-full p-3 mt-3 bg-zinc-800 border-gray-600 rounded-md focus:border-emerald-600 focus:ring focus:ring-opacity-40 focus:ring-emerald-500
              "
                    class="flex-1 !flex"
                    @input="(email: string) => getOwnerEmail(email)"
                  />
                </div>
              </div>

              <div class="flex justify-end my-2 pt-3">
                <HoppButtonPrimary label="Create Team" @click="createTeam" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </HoppSmartModal>

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
import { TippyComponent } from 'vue-tippy';
import IconTrash from '~icons/lucide/trash';
import IconMoreHorizontal from '~icons/lucide/more-horizontal';

const toast = useToast();
// Template refs
const tippyActions = ref<TippyComponent | null>(null);

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
const teamName = ref('');
const ownerEmail = ref('');
const createTeamMutation = useMutation(CreateTeamDocument);
const showCreateTeamModal = ref(false);
const getOwnerEmail = (email: string) => (ownerEmail.value = email);

const createTeam = async () => {
  const userUid =
    usersList.value.find((user) => user.email === ownerEmail.value)?.uid || '';
  const variables = { name: teamName.value.trim(), userUid: userUid };
  await createTeamMutation.executeMutation(variables).then((result) => {
    if (result.error) {
      if (teamName.value.length < 6) {
        toast.error('Team name should be atleast 6 characters long!!');
      }
      if (result.error.toString() == '[GraphQL] user/not_found') {
        toast.error('User not found!!');
      } else {
        toast.error('Failed to create team!!');
      }
    } else {
      toast.success('Team created successfully!!');
      showCreateTeamModal.value = false;
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
