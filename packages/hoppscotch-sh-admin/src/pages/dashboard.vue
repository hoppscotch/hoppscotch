<template>
  <div class="flex flex-col">
    <div v-if="fetching" class="flex justify-center">
      <HoppSmartSpinner />
    </div>

    <div v-else-if="error || !metrics">
      <p class="text-xl">No Metrics Found..</p>
    </div>

    <div v-else>
      <h1 class="text-lg font-bold text-secondaryDark">Dashboard</h1>
      <div class="py-10 grid lg:grid-cols-2 gap-6">
        <DashboardMetricsCard
          :count="metrics.usersCount"
          label="Total Users"
          :icon="UserIcon"
          color="text-green-400"
        />
        <DashboardMetricsCard
          :count="metrics.teamsCount"
          label="Total Teams"
          :icon="UsersIcon"
          color="text-pink-400"
        />
        <DashboardMetricsCard
          :count="metrics.teamRequestsCount"
          label="Total Requests"
          :icon="LineChartIcon"
          color="text-cyan-400"
        />
        <DashboardMetricsCard
          :count="metrics.teamCollectionsCount"
          label="Total Collections"
          :icon="FolderTreeIcon"
          color="text-orange-400"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useQuery } from '@urql/vue';
import { MetricsDocument } from '../helpers/backend/graphql';
import UserIcon from '~icons/lucide/user';
import UsersIcon from '~icons/lucide/users';
import LineChartIcon from '~icons/lucide/line-chart';
import FolderTreeIcon from '~icons/lucide/folder-tree';

// Get Metrics Data
const { fetching, error, data } = useQuery({ query: MetricsDocument });
const metrics = computed(() => data?.value?.admin);
</script>
