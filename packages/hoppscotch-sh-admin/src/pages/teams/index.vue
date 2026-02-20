<template>
  <div class="flex flex-col">
    <div class="flex flex-col">
      <h1 class="text-lg font-bold text-secondaryDark">
        {{ t('teams.teams') }}
      </h1>
      <div class="flex items-center mt-10 mb-5">
        <HoppButtonPrimary
          :icon="IconAddUsers"
          :label="t('teams.create_team')"
          @click="showCreateTeamModal = true"
        />
      </div>
      <div class="overflow-x-auto mb-5">
        <div class="mb-3 flex items-center justify-end">
          <HoppButtonSecondary
            outline
            filled
            :icon="IconLeft"
            :disabled="page === 1"
            @click="changePage(PageDirection.Previous)"
          />

          <div class="flex h-full w-10 items-center justify-center">
            <span>{{ page }}</span>
          </div>

          <HoppButtonSecondary
            outline
            filled
            :icon="IconRight"
            :disabled="!hasNextPage"
            @click="changePage(PageDirection.Next)"
          />
        </div>

        <HoppSmartTable
          :headings="headings"
          :list="teamsList"
          :loading="fetching"
          @onRowClicked="goToTeamDetails"
        >
          <template #extension>
            <div class="flex w-full items-center bg-primary">
              <icon-lucide-search class="mx-3 text-xs" />
              <HoppSmartInput
                v-model="query"
                styles="w-full bg-primary py-1"
                input-styles="h-full border-none"
                :placeholder="t('teams.search_placeholder')"
              />
            </div>
          </template>

          <template #empty-state>
            <td colspan="4">
              <span class="flex justify-center p-3">
                {{
                  error
                    ? t('teams.load_list_error')
                    : searchQuery
                      ? t('teams.no_search_results')
                      : t('teams.no_teams')
                }}
              </span>
            </td>
          </template>

          <template #head>
            <th class="px-6 py-2">{{ t('teams.id') }}</th>
            <th class="px-6 py-2">{{ t('teams.name') }}</th>
            <th class="px-6 py-2">{{ t('teams.members') }}</th>
            <!-- Empty Heading for the Action Button -->
            <th class="px-6 py-2"></th>
          </template>
          <template #body="{ row: team }">
            <td class="flex py-4 px-7 max-w-[16rem]">
              <span class="truncate">
                {{ team.id }}
              </span>
            </td>

            <td class="py-4 px-7 min-w-[20rem]">
              <span
                class="flex items-center truncate"
                :class="{ truncate: team.name }"
              >
                {{ team.name ?? t('teams.unnamed') }}
              </span>
            </td>

            <td class="py-4 px-8">
              {{ team.teamMembers?.length }}
            </td>

            <td @click.stop class="flex justify-end mr-10">
              <div class="relative">
                <tippy
                  :key="team.id"
                  interactive
                  trigger="click"
                  theme="popover"
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
                        :label="t('teams.delete_team')"
                        class="!hover:bg-red-600 w-full"
                        @click="
                          () => {
                            deleteTeam(team.id);
                            hide();
                          }
                        "
                      />
                    </div>
                  </template>
                </tippy>
              </div>
            </td>
          </template>
        </HoppSmartTable>
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
    :title="t('teams.confirm_team_deletion')"
    @hide-modal="confirmDeletion = false"
    @resolve="deleteTeamMutation(deleteTeamID)"
  />
</template>

<script setup lang="ts">
import { useMutation, useQuery } from '@urql/vue';
import { computed, onUnmounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from '~/composables/i18n';
import { useToast } from '~/composables/toast';
import { usePagedQuery } from '~/composables/usePagedQuery';
import IconLeft from '~icons/lucide/chevron-left';
import IconRight from '~icons/lucide/chevron-right';
import IconMoreHorizontal from '~icons/lucide/more-horizontal';
import IconAddUsers from '~icons/lucide/plus';
import IconTrash from '~icons/lucide/trash';
import {
  CreateTeamDocument,
  MetricsDocument,
  RemoveTeamDocument,
  TeamInfoQuery,
  TeamListV2Document,
  UsersListDocument,
} from '../../helpers/backend/graphql';

const t = useI18n();
const toast = useToast();

// Get Users List (for team creation modal)
const { data } = useQuery({ query: MetricsDocument, variables: {} });
const usersPerPage = computed(() => data.value?.infra.usersCount || 10000);

const { list: usersList } = usePagedQuery(
  UsersListDocument,
  (x) => x.infra.allUsers,
  usersPerPage.value,
  { cursor: undefined, take: usersPerPage.value },
  (x) => x.uid,
);

const allUsersEmail = computed(() => usersList.value.map((user) => user.email));

// Paginated Teams with server-side search
const teamsPerPage = 20;
const page = ref(1);

// Ensure this variable is declared outside the debounce function
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

onUnmounted(() => {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
});

// Debounce Function
const debounce = (func: () => void, delay: number) => {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(func, delay);
};

// Search
const query = ref('');
// Query which is sent to the backend after debouncing
const searchQuery = ref('');

const handleSearch = (input: string) => {
  searchQuery.value = input;
  // Reset the page to 1 when the search query changes
  page.value = 1;
};

watch(query, () => {
  if (query.value.length === 0) {
    handleSearch(query.value);
  } else {
    debounce(() => {
      handleSearch(query.value);
    }, 500);
  }
});

// useQuery auto-refetches when computed variables change (page or search)
// Fetches teamsPerPage + 1 to determine if a next page exists without a total count
const {
  data: teamsData,
  fetching,
  error,
  executeQuery,
} = useQuery({
  query: TeamListV2Document,
  variables: computed(() => ({
    searchString: searchQuery.value || null,
    skip: (page.value - 1) * teamsPerPage,
    take: teamsPerPage + 1,
  })),
});

const teamsRaw = computed(() => teamsData.value?.infra.allTeamsV2 ?? []);
const hasNextPage = computed(() => teamsRaw.value.length > teamsPerPage);
const teamsList = computed(() => teamsRaw.value.slice(0, teamsPerPage));
const refetch = () => executeQuery({ requestPolicy: 'network-only' });

// If a page loads empty and we're not on page 1, auto-regress
watch(teamsList, (list) => {
  if (list.length === 0 && page.value > 1) {
    page.value = 1;
  }
});

// Pagination
enum PageDirection {
  Previous,
  Next,
}

const changePage = (direction: PageDirection) => {
  const isPrevious = direction === PageDirection.Previous;

  const isValidPreviousAction = isPrevious && page.value > 1;
  const isValidNextAction = !isPrevious && hasNextPage.value;

  if (isValidNextAction || isValidPreviousAction) {
    page.value += isPrevious ? -1 : 1;
  }
};

// Table Headings
const headings = [
  { key: 'id', label: t('teams.id') },
  { key: 'name', label: t('teams.name') },
  { key: 'members', label: t('teams.members') },
  { key: 'actions', label: '' },
];

// Create Team
const showCreateTeamModal = ref(false);
const createTeamLoading = ref(false);
const createTeamMutation = useMutation(CreateTeamDocument);

const createTeam = async (newTeamName: string, ownerEmail: string) => {
  if (newTeamName.length < 6) {
    toast.error(t('state.team_name_too_short'));
    return;
  }
  if (ownerEmail.length === 0) {
    toast.error(t('state.enter_team_email'));
    return;
  }

  createTeamLoading.value = true;
  const userUid =
    usersList.value.find((user) => user.email === ownerEmail)?.uid || '';

  const variables = { name: newTeamName.trim(), userUid: userUid };

  const result = await createTeamMutation.executeMutation(variables);
  if (result.error) {
    if (result.error.toString() == '[GraphQL] user/not_found') {
      toast.error(t('state.user_not_found'));
    } else {
      toast.error(t('state.create_team_failure'));
    }
  } else {
    toast.success(t('state.create_team_success'));
    showCreateTeamModal.value = false;
    refetch();
  }
  createTeamLoading.value = false;
};

// Go To Individual Team Details Page
const router = useRouter();
const goToTeamDetails = (team: TeamInfoQuery['infra']['teamInfo']) =>
  router.push('/teams/' + team.id);

// Team Deletion
const confirmDeletion = ref(false);
const deleteTeamID = ref<string | null>(null);
const teamDeletion = useMutation(RemoveTeamDocument);

const deleteTeam = (id: string) => {
  confirmDeletion.value = true;
  deleteTeamID.value = id;
};

const deleteTeamMutation = async (id: string | null) => {
  if (!id) {
    confirmDeletion.value = false;
    toast.error(t('state.delete_team_failure'));
    return;
  }
  const result = await teamDeletion.executeMutation({ uid: id });
  if (result.error) {
    toast.error(t('state.delete_team_failure'));
  } else {
    toast.success(t('state.delete_team_success'));
    // If the current page becomes empty after deletion, go back to the previous page
    if (teamsList.value.length === 1 && page.value > 1) {
      page.value--;
    } else {
      refetch();
    }
  }
  confirmDeletion.value = false;
  deleteTeamID.value = null;
};
</script>
