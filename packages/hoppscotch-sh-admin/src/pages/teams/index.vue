<template>
  <div>
    <h3 class="sm:px-6 p-4 text-3xl font-medium text-gray-200">Teams</h3>

    <div class="flex flex-col">
      <div class="py-2 -my-2 overflow-x-auto sm:-mx-6 sm:px-4 lg:-mx-8 lg:px-8">
        <div class="inline-block min-w-full overflow-hidden align-middle">
          <div class="sm:px-7 p-4">
            <div v-if="showOptions" class="flex w-full items-center mb-7">
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
                    <th class="font-normal px-3 pt-0 pb-3">Team ID</th>
                    <th class="font-normal px-3 pt-0 pb-3">Team Name</th>
                    <th class="font-normal px-3 pt-0 pb-3 hidden md:table-cell">
                      Members
                    </th>
                    <!-- <th class="font-normal px-3 pt-0 pb-3">Status</th> -->
                    <th class="font-normal px-3 pt-0 pb-3">Date</th>
                  </tr>
                </thead>
                <tbody class="text-gray-300">
                  <!-- <router-link :custom="true" class="" :to="'/team/detail'"> -->
                  <tr
                    v-for="team in teams"
                    id="team.id"
                    class="border-b border-gray-600 hover:bg-zinc-800 rounded-xl"
                    @click="goToTeam"
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
                    <td class="sm:p-3 py-2 px-1">
                      <div class="flex">
                        <span class="ml-3">
                          {{ team.id }}
                        </span>
                      </div>
                    </td>

                    <td
                      class="sm:p-3 py-2 px-1 md:table-cell hidden text-sky-300"
                    >
                      {{ team.name }}
                    </td>
                    <td class="sm:p-3 py-2 px-1 justify-center">
                      {{ team.members }}
                    </td>
                    <td class="sm:p-3 py-2 px-1">
                      <div class="flex items-center">
                        <div class="sm:flex hidden flex-col">
                          {{ team.date }}
                          <div class="text-gray-400 text-xs">11:16 AM</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <button
                        class="w-8 h-8 inline-flex items-center justify-right text-gray-400"
                      >
                        <icon-lucide-more-horizontal />
                      </button>
                    </td>
                  </tr>
                  <!-- </router-link> -->
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { defineProps } from 'vue';

defineProps({
  showOptions: {
    type: Boolean,
    default: true,
  },
});

interface Team {
  id: string;
  name: string;
  members: number;
  date: string;
}

const teams: Array<Team> = [
  {
    id: '123e4',
    name: 'HoppMain',
    members: 100,
    date: '15-01-2023',
  },
  {
    id: '12vbe',
    name: 'Hopp',
    members: 10,
    date: '19-05-2023',
  },
  {
    id: 'bg1d2',
    name: 'Kratos',
    members: 59,
    date: '15-03-2023',
  },
];

const router = useRouter();

const goToTeam = () => {
  router.push('/teams/details');
};
</script>
