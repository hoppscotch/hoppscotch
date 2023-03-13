<template>
  <div class="sm:px-6 p-4">
    <h3 class="sm:px-6 p-4 text-3xl font-medium text-gray-200">Team Details</h3>

    <div class="mt-5">
      <div class="flex flex-wrap justify-center mx-6">
        <div class="w-full px-4 sm:w-1/2 xl:w-1/3">
          <div class="h-80 px-6 py-6 bg-zinc-800 rounded-md shadow-sm">
            <div class="flex ml-3 mt-2">
              <icon-lucide-user class="text-emerald-400 text-3xl" />

              <h4 class="text-3xl ml-2 font-semibold text-gray-200">
                Team Info
              </h4>
            </div>
            <div class="flex mt-5 ml-5 text-xl">
              <h4 class="font-semibold text-gray-400">Team ID:</h4>
              <div class="text-gray-200 ml-2">
                {{ team.id }}
              </div>
            </div>
            <div class="flex mt-2 ml-5 text-xl">
              <h4 class="font-semibold text-gray-400">Team Name:</h4>
              <div class="text-gray-200 ml-2">
                {{ team.name }}
              </div>
            </div>

            <div class="flex mt-2 ml-5 text-xl">
              <h4 class="font-semibold text-gray-400">Creation Date:</h4>
              <div class="text-gray-200 ml-2">
                {{ team.date }}
              </div>
            </div>

            <div class="flex mt-2 ml-5 text-xl">
              <h4 class="font-semibold text-gray-400">Number of members:</h4>
              <div class="text-gray-200 ml-2">
                {{ team.members }}
              </div>
            </div>
          </div>
        </div>

        <div class="w-full px-4 sm:w-1/2 xl:w-1/3">
          <div class="h-80 px-5 py-6 bg-zinc-800 rounded-md shadow-sm">
            <div class="flex ml-3 mt-2">
              <icon-lucide-line-chart class="text-yellow-300 text-3xl" />

              <h4 class="text-3xl ml-2 font-semibold text-gray-200">Stats</h4>
            </div>

            <div class="flex mt-5 ml-5 text-xl">
              <h4 class="font-semibold text-gray-400">
                Number of Collections:
              </h4>
              <div class="text-gray-200 ml-2">
                {{ stats.collections }}
              </div>
            </div>

            <div class="flex mt-2 ml-5 text-xl">
              <h4 class="font-semibold text-gray-400">Number of Requests:</h4>
              <div class="text-gray-200 ml-2">
                {{ stats.requests }}
              </div>
            </div>

            <div class="flex mt-2 ml-5 text-xl">
              <h4 class="font-semibold text-gray-400">
                Number of Environments:
              </h4>
              <div class="text-gray-200 ml-2">
                {{ stats.environments }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="mt-6"></div>

    <div class="mx-10">
      <TeamsAddMembers />
    </div>

    <div class="mt-8"></div>
  </div>
</template>

<script setup lang="ts">
import { reactive } from 'vue';

interface Team {
  id: string;
  name: string;
  date: string;
  members: number;
}

const team = reactive<Team>({
  id: 'absd123',
  name: 'SelfHosters',
  date: '30-01-2023',
  members: 20,
});

interface Stats {
  collections: number;
  requests: number;
  environments: number;
}

const stats = reactive<Stats>({
  collections: 10,
  requests: 20,
  environments: 30,
});
</script>
