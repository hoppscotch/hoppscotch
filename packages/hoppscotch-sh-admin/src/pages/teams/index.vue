<template>
  <div>
    <h3 class="sm:px-6 p-4 text-3xl font-medium text-gray-200">Teams</h3>

    <div class="flex flex-col" v-if="!fetching">
      <div class="py-2 overflow-x-auto">
        <div class="inline-block min-w-full overflow-hidden align-middle">
          <div class="sm:px-7 p-4">
            <div class="flex w-full items-center mb-7">
              <button
                class="inline-flex mr-3 items-center h-8 pl-2.5 pr-2 rounded-md shadow text-gray-400 border-gray-800 border-2 leading-none py-0"
              >
                Last 30 days
                <icon-lucide-chevron-down class="w-4 ml-1.5 text-gray-600" />
              </button>
              <button
                class="inline-flex items-center h-8 pl-2.5 pr-2 rounded-md shadow text-gray-400 border-gray-800 border-2 leading-none py-0"
              >
                Filter by
                <icon-lucide-chevron-down class="w-4 ml-1.5 text-gray-600" />
              </button>
              <router-link to="/teams/addteam">
                <button
                  class="inline-flex items-center bg-emerald-700 h-8 ml-3 pl-2.5 pr-2 rounded-md shadow border-gray-800 border leading-none py-0 hover:bg-emerald-700 focus:outline-none focus:bg-emerald-800"
                >
                  Create Team
                </button>
              </router-link>
              <div
                class="ml-auto text-gray-400 text-xs sm:inline-flex hidden items-center"
              >
                <span class="mr-3">Page 2 of 4</span>
                <button
                  class="inline-flex mr-2 items-center h-8 w-8 justify-center text-gray-400 rounded-md shadow border border-gray-800 leading-none py-0"
                >
                  <icon-lucide-chevron-left class="text-xl" />
                </button>
                <button
                  class="inline-flex items-center h-8 w-8 justify-center text-gray-400 rounded-md shadow border border-gray-800 leading-none py-0"
                >
                  <icon-lucide-chevron-right class="text-xl" />
                </button>
              </div>
            </div>

            <div>
              <table class="w-full text-left">
                <thead>
                  <tr class="text-gray-200 border-b border-gray-600 text-sm">
                    <th class="font-normal px-3 pt-0 pb-3"></th>
                    <th class="font-normal px-3 pt-0 pb-3">Team Name</th>
                    <th class="font-normal px-3 pt-0 pb-3">Team ID</th>
                    <th class="font-normal px-3 pt-0 pb-3 md:table-cell">
                      Number of Members
                    </th>
                    <th class="font-normal px-3 pt-0 pb-3">Action</th>
                  </tr>
                </thead>
                <tbody class="text-gray-300">
                  <!-- <router-link :custom="true" class="" :to="'/team/detail'"> -->
                  <tr
                    v-for="(team, index) in teamList"
                    :key="team.id"
                    class="border-b border-gray-300 dark:border-gray-600 hover:bg-zinc-800 rounded-xl"
                  >
                    <td>
                      <label>
                        <input
                          type="checkbox"
                          class="appearance-none bg-gray-600 checked:bg-emerald-600 rounded-md ml-3 w-5 h-5"
                          name="radio"
                        />
                      </label>
                    </td>

                    <td
                      class="sm:p-3 py-2 px-1 md:table-cell text-sky-300"
                      @click="goToTeam(team.id)"
                    >
                      <span class="hover:underline cursor-pointer">
                        {{ team.name }}
                      </span>
                    </td>

                    <td @click="goToTeam(team.id)" class="sm:p-3 py-2 px-1">
                      <span class="hover:underline cursor-pointer">
                        {{ team.id }}
                      </span>
                    </td>

                    <td class="sm:p-3 py-2 px-1 justify-center">
                      {{ team.members?.length }}
                    </td>
                    <td>
                      <tippy
                        interactive
                        trigger="click"
                        theme="popover"
                        :on-shown="() => tippyActions![index].focus()"
                      >
                        <span class="cursor-pointer">
                          <icon-lucide-more-horizontal />
                        </span>
                        <template #content="{ hide }">
                          <div
                            ref="tippyActions"
                            class="flex flex-col focus:outline-none"
                            tabindex="0"
                            @keyup.escape="hide()"
                          >
                            <HoppSmartItem
                              label="Delete"
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
                    </td>
                  </tr>
                  <!-- </router-link> -->
                </tbody>
              </table>
            </div>

            <div v-if="teamList.length >= 20" class="text-center">
              <button
                @click="fetchNextTeams"
                class="mt-5 p-2 rounded-3xl bg-gray-700"
              >
                <icon-lucide-chevron-down class="text-xl" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <HoppSmartConfirmModal
    :show="confirmDeletion"
    :title="`Confirm Deletion of the team?`"
    @hide-modal="confirmDeletion = false"
    @resolve="deleteTeamMutation(deleteTeamID)"
  />
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';

import {
  RemoveTeamDocument,
  TeamListDocument,
} from '../../helpers/backend/graphql';
import { usePagedQuery } from '../../composables/usePagedQuery';

import { onMounted, onBeforeUnmount, ref } from 'vue';
import { useMutation } from '@urql/vue';
import { useToast } from '../../composables/toast';

const toast = useToast();

const router = useRouter();

const {
  fetching,
  goToNextPage: fetchNextTeams,
  refetch,
  list: teamList,
} = usePagedQuery(
  TeamListDocument,
  (x) => x.admin.allTeams,
  (x) => x.id,
  10,
  { cursor: undefined, take: 10 }
);

const goToTeam = (teamId: string) => {
  router.push('/teams/' + teamId);
};

// Open the side menu dropdown of only the selected user
const activeTeamId = ref<null | String>(null);

// Template refs
const tippyActions = ref<any | null>(null);

// Hide dropdown when user clicks elsewhere
const close = (e: any) => {
  if (!e.target.closest('.dropdown')) {
    activeTeamId.value = null;
  }
};

onMounted(() => document.addEventListener('click', close));
onBeforeUnmount(() => document.removeEventListener('click', close));

// User Deletion
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
    toast.error('Team Deletion Failed');
    return;
  }
  const variables = { uid: id };
  await teamDeletion.executeMutation(variables).then((result) => {
    if (result.error) {
      toast.error('Team Deletion Failed');
    } else {
      refetch();
      toast.success('Team Deleted Successfully');
    }
  });
  confirmDeletion.value = false;
  deleteTeamID.value = null;
  router.push('/teams');
};
</script>
