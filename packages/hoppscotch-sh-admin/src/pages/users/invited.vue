<template>
  <div class="flex flex-col">
    <div class="flex">
      <button class="p-2 rounded-3xl bg-divider" @click="router.push('/users')">
        <icon-lucide-arrow-left class="text-xl" />
      </button>
    </div>

    <h3 class="text-lg font-bold text-accentContrast py-6">
      {{ t('users.invited_users') }}
    </h3>

    <div class="flex flex-col">
      <div class="py-2 overflow-x-auto">
        <div>
          <div v-if="fetching" class="flex justify-center">
            <HoppSmartSpinner />
          </div>
          <div v-else-if="error || invitedUsers === undefined">
            <p class="text-xl">{{ t('users.no_invite') }}</p>
          </div>

          <table v-else class="w-full text-left">
            <thead>
              <tr
                class="text-secondary border-b border-dividerDark text-sm text-left"
              >
                <th class="px-3 pb-3">{{ t('users.admin_id') }}</th>
                <th class="px-3 pb-3">{{ t('users.admin_email') }}</th>
                <th class="px-3 pb-3">{{ t('users.invitee_email') }}</th>
                <th class="px-3 pb-3">{{ t('users.invited_on') }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-divider">
              <tr
                v-if="invitedUsers.length === 0"
                class="text-secondaryDark py-4"
              >
                <div class="py-6 px-3">{{ t('users.no_invite') }}</div>
              </tr>
              <tr
                v-else
                v-for="(user, index) in invitedUsers"
                :key="index"
                class="text-secondaryDark hover:bg-zinc-800 hover:cursor-pointer rounded-xl"
              >
                <td class="py-2 px-3 max-w-36">
                  <div class="flex">
                    <span class="truncate">
                      {{ user?.adminUid }}
                    </span>
                  </div>
                </td>
                <td class="py-2 px-3">
                  <span class="flex items-center">
                    {{ user?.adminEmail }}
                  </span>
                </td>
                <td class="py-2 px-3 max-w-52">
                  <div class="flex">
                    <span class="truncate">
                      {{ user?.inviteeEmail }}
                    </span>
                  </div>
                </td>
                <td class="py-2 px-3">
                  <div class="flex items-center">
                    <div class="flex flex-col">
                      {{ getCreatedDate(user?.invitedOn) }}
                      <div class="text-gray-400 text-xs">
                        {{ getCreatedTime(user?.invitedOn) }}
                      </div>
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useQuery } from '@urql/vue';
import { InvitedUsersDocument } from '../../helpers/backend/graphql';
import { format } from 'date-fns';
import { HoppSmartSpinner } from '@hoppscotch/ui';
import { useRouter } from 'vue-router';
import { useI18n } from '~/composables/i18n';

const t = useI18n();

const router = useRouter();

// Get Proper Date Formats
const getCreatedDate = (date: string) => format(new Date(date), 'dd-MM-yyyy');
const getCreatedTime = (date: string) => format(new Date(date), 'hh:mm a');

// Get Invited Users
const { fetching, error, data } = useQuery({ query: InvitedUsersDocument });
const invitedUsers = computed(() => data?.value?.admin.invitedUsers);
</script>
