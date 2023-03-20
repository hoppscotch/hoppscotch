<template>
  <div class="sm:px-6 p-4">
    <h3 class="text-3xl font-bold text-gray-200 mb-6">Dashboard</h3>

    <div v-if="fetching" class="flex justify-center">
      <HoppSmartSpinner />
    </div>
    <div v-else-if="error">
      <p class="text-xl">No Metrics Found..</p>
    </div>

    <div v-else class="mt-4">
      <div class="grid lg:grid-cols-2 gap-6">
        <div class="w-full">
          <div
            class="flex items-center px-15 py-6 bg-primaryLight rounded-md shadow-sm h-50"
          >
            <icon-lucide-user-cog class="text-5xl text-emerald-500" />

            <div class="mx-10">
              <h4 class="text-4xl font-semibold text-gray-200">
                {{ metrics?.usersCount }}
              </h4>
              <div class="text-gray-400 font-bold text-xl">Total Users</div>
            </div>
          </div>
        </div>

        <div class="w-full">
          <div
            class="flex items-center px-15 py-6 bg-primaryLight rounded-md shadow-sm h-50"
          >
            <icon-lucide-users class="text-5xl text-pink-400" />

            <div class="mx-10">
              <h4 class="text-4xl font-semibold text-gray-200">
                {{ metrics?.teamsCount }}
              </h4>
              <div class="text-gray-400 font-bold text-xl">Total Teams</div>
            </div>
          </div>
        </div>

        <div class="w-full">
          <div
            class="flex items-center px-15 py-6 bg-primaryLight rounded-md shadow-sm h-50"
          >
            <icon-lucide-line-chart class="text-5xl text-cyan-400" />

            <div class="mx-10">
              <h4 class="text-4xl font-semibold text-gray-200">
                {{ metrics?.teamRequestsCount }}
              </h4>
              <div class="text-gray-400 font-bold text-xl">Total Requests</div>
            </div>
          </div>
        </div>

        <div class="w-full">
          <div
            class="flex items-center px-15 py-6 bg-primaryLight rounded-md shadow-sm h-50"
          >
            <icon-lucide-folder-tree class="text-5xl text-orange-400" />

            <div class="mx-10">
              <h4 class="text-4xl font-semibold text-gray-200">
                {{ metrics?.teamCollectionsCount }}
              </h4>
              <div class="text-gray-400 font-bold text-xl">
                Total Collections
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useQuery } from '@urql/vue';
import { MetricsDocument } from '../helpers/backend/graphql';

// Get Metrics Data
const { fetching, error, data } = useQuery({ query: MetricsDocument });
const metrics = computed(() => data?.value?.admin);
</script>
