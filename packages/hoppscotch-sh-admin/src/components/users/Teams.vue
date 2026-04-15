<template>
  <div class="px-4 mt-7">
    <div v-if="fetching" class="flex justify-center">
      <HoppSmartSpinner />
    </div>

    <div v-else-if="error">{{ t('user_teams.load_error') }}</div>

    <div v-else-if="teams.length === 0">
      {{ t('user_teams.no_teams') }}
    </div>

    <HoppSmartTable v-else :headings="headings" :list="teams">
      <template #head>
        <th class="px-6 py-2">{{ t('user_teams.workspace_name') }}</th>
        <th class="px-6 py-2">{{ t('user_teams.workspace_id') }}</th>
        <th class="px-6 py-2">{{ t('user_teams.role') }}</th>
      </template>
      <template #body="{ row: team }">
        <td class="py-4 px-7 max-w-50">
          <RouterLink
            :to="`/teams/${team.id}`"
            class="text-accent hover:underline"
          >
            {{ team.name }}
          </RouterLink>
        </td>
        <td class="py-4 px-7">
          <span class="font-mono text-secondaryDark text-sm">{{
            team.id
          }}</span>
        </td>
        <td class="py-4 px-7">
          <span
            class="text-xs font-medium px-2.5 py-0.5 rounded-full"
            :class="roleBadgeClass(team.role)"
          >
            {{ team.role ?? t('user_teams.role_unknown') }}
          </span>
        </td>
      </template>
    </HoppSmartTable>

    <div
      v-if="hasNextPage && teams.length >= teamsPerPage"
      class="flex items-center w-28 px-3 py-2 mt-5 mx-auto font-semibold text-secondaryDark bg-divider hover:bg-dividerDark rounded-3xl cursor-pointer"
      @click="fetchNextTeams"
    >
      <span class="mr-2">{{ t('user_teams.show_more') }}</span>
      <icon-lucide-chevron-down />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from '~/composables/i18n';
import { usePagedQuery } from '~/composables/usePagedQuery';
import {
  TeamsOfUserByAdminDocument,
  TeamAccessRole,
} from '~/helpers/backend/graphql';

const t = useI18n();

const props = defineProps<{
  userUid: string;
}>();

const teamsPerPage = 10;

const {
  fetching,
  error,
  goToNextPage: fetchNextTeams,
  list,
  hasNextPage,
} = usePagedQuery(
  TeamsOfUserByAdminDocument,
  (x) => x.teamsOfUserByAdmin,
  teamsPerPage,
  { userUid: props.userUid, cursor: undefined, take: teamsPerPage },
  (x) => x.id,
);

// Flatten the team + role into a single row object
const teams = computed(() =>
  list.value.map((team) => {
    const member = team.teamMembers.find((m) => m.user.uid === props.userUid);
    return { id: team.id, name: team.name, role: member?.role ?? null };
  }),
);

const headings = [
  { key: 'name', label: t('user_teams.workspace_name') },
  { key: 'id', label: t('user_teams.workspace_id') },
  { key: 'role', label: t('user_teams.role') },
];

const roleBadgeClass = (role: TeamAccessRole | null) => {
  switch (role) {
    case TeamAccessRole.Owner:
      return 'bg-blue-900 text-blue-300';
    case TeamAccessRole.Editor:
      return 'bg-yellow-900 text-yellow-300';
    case TeamAccessRole.Viewer:
      return 'bg-gray-700 text-gray-300';
    default:
      return 'bg-gray-700 text-gray-300';
  }
};
</script>
