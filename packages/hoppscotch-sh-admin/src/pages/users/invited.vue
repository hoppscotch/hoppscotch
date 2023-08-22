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
          <div
            v-else-if="
              error || invitedUsers === undefined || invitedUsers.length === 0
            "
          >
            <p class="text-xl">{{ t('users.no_invite') }}</p>
          </div>

          <div v-else>
            <HoppSmartTable :list="newInvitedUsersList" :headings="headings">
              <template #invitedOn="{ item }">
                <div class="flex flex-col truncate">
                  <span v-if="item" class="truncate">
                    {{ getCreatedDate(item.invitedOn) }}
                  </span>
                  <span v-else> - </span>

                  <div>
                    <div class="text-gray-400 text-tiny">
                      <span>
                        <span>
                          {{ getCreatedTime(item.invitedOn) }}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              </template>
            </HoppSmartTable>
          </div>
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

// The new invited users list that is used in the table
const newInvitedUsersList = computed(() => {
  return invitedUsers.value?.map((user) => {
    return {
      adminUid: user.adminUid,
      adminEmail: user.adminEmail,
      inviteeEmail: user.inviteeEmail,
      invitedOn: user.invitedOn,
    };
  });
});

// Table Headings
const headings = [
  { key: 'adminUid', label: t('users.admin_id') },
  { key: 'adminEmail', label: t('users.admin_email') },
  { key: 'inviteeEmail', label: t('users.invitee_email') },
  { key: 'invitedOn', label: t('users.invited_on') },
];
</script>
