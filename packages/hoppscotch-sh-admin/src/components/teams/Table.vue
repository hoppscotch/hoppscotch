<template>
  <table class="w-full">
    <thead>
      <tr class="text-secondary border-b border-dividerDark text-sm text-left">
        <th class="px-3 pb-3">Team ID</th>
        <th class="px-3 pb-3">Team Name</th>
        <th class="px-3 pb-3">Number of Members</th>
        <th class="px-3 pb-3"></th>
      </tr>
    </thead>

    <tbody class="divide-y divide-divider">
      <tr v-if="teamList.length === 0">
        <div class="py-6 px-3">No teams found ...</div>
      </tr>
      <tr
        v-else
        v-for="team in teamList"
        :key="team.id"
        class="text-secondaryDark hover:bg-divider hover:cursor-pointer rounded-xl"
      >
        <td
          @click="$emit('go-to-team-details', team.id)"
          class="py-4 px-3 max-w-50"
        >
          <div class="flex">
            <span class="truncate">
              {{ team.id }}
            </span>
          </div>
        </td>

        <td
          @click="$emit('go-to-team-details', team.id)"
          class="py-4 px-3 min-w-80"
        >
          <span v-if="team.name" class="flex items-center ml-4 truncate">
            {{ team.name }}
          </span>
          <span v-else class="flex items-center ml-4"> (Unnamed team) </span>
        </td>

        <td @click="$emit('go-to-team-details', team.id)" class="py-4 px-3">
          <span class="ml-7">
            {{ team.members?.length }}
          </span>
        </td>

        <td>
          <div class="relative">
            <tippy interactive trigger="click" theme="popover">
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
                    @click="
                      () => {
                        $emit('delete-team', team.id);
                        hide();
                      }
                    "
                  />
                </div>
              </template>
            </tippy>
          </div>
        </td>
      </tr>
    </tbody>
  </table>
</template>

<script setup lang="ts">
import { TippyComponent } from 'vue-tippy';
import { ref } from 'vue';
import IconTrash from '~icons/lucide/trash';
import IconMoreHorizontal from '~icons/lucide/more-horizontal';
import { TeamListQuery } from '~/helpers/backend/graphql';

// Template refs
const tippyActions = ref<TippyComponent | null>(null);

defineProps<{
  teamList: TeamListQuery['admin']['allTeams'];
}>();

defineEmits<{
  (event: 'go-to-team-details', teamID: string): void;
  (event: 'delete-team', teamID: string): void;
}>();
</script>
