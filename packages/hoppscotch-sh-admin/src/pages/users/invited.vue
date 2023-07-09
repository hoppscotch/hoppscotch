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

          <HoppSmartTable
            v-else
            cell-styles="px-6 py-2"
            :list="newInvitedUsersList"
            :headings="headings"
            :subtitles="subtitles"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive } from 'vue';
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
      invitedOn: getCreatedDate(user.invitedOn),
    };
  });
});

// Returns the created time of all the invited user
const createdTime = computed(() => {
  return invitedUsers.value?.map((user) => {
    return getCreatedTime(user.invitedOn);
  });
});

// Headings used in the table
const headings = [
  t('users.admin_id'),
  t('users.admin_email'),
  t('users.invitee_email'),
  t('users.invited_on'),
];

// Subtitles used in the table
const subtitles = reactive([
  {
    colName: 'invitedOn',
    subtitle: createdTime,
  },
]);
</script>
