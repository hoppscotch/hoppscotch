<template>
  <div class="flex flex-col">
    <div class="flex">
      <button class="p-2 rounded-3xl bg-divider" @click="router.push('/users')">
        <icon-lucide-arrow-left class="text-xl" />
      </button>
    </div>

    <h3 class="text-lg font-bold text-accentContrast pt-6 pb-4">
      {{ t('users.pending_invites') }}
    </h3>

    <div class="flex flex-col">
      <div class="relative py-2 overflow-x-auto">
        <div v-if="fetching" class="flex justify-center">
          <HoppSmartSpinner />
        </div>

        <div v-else-if="error">
          {{ t('users.invite_load_list_error') }}
        </div>

        <UsersTable
          v-if="invitedUsers?.length"
          :headings="headings"
          :list="invitedUsers"
          :checkbox="true"
          :spinner="{ enabled: fetching, duration: 1000 }"
          :selectedRows="selectedRows"
        >
          <template #invitedOn="{ item }">
            <div v-if="item" class="pr-2 truncate">
              <span class="truncate">
                {{ getCreatedDate(item.invitedOn) }}
              </span>

              <div class="text-gray-400 text-tiny">
                {{ getCreatedTime(item.invitedOn) }}
              </div>
            </div>
            <span v-else> - </span>
          </template>
          <template #action="{ item }">
            <div v-if="item" class="my-1 mr-2">
              <HoppButtonPrimary
                :icon="IconTrash"
                label="Revoke Invitation"
                class="bg-red-500 hover:bg-red-600"
                @click="deleteInvite(item.inviteeEmail)"
              />
            </div>
          </template>
        </UsersTable>

        <div
          v-if="selectedRows.length"
          class="fixed m-2 bottom-0 left-40 right-0 w-min mx-auto shadow-2xl"
        >
          <div
            class="flex justify-center items-end bg-primaryLight border border-divider rounded-md mb-5"
          >
            <HoppButtonSecondary
              :label="t('state.selected', { count: selectedRows.length })"
              class="py-4 border-divider rounded-r-none bg-emerald-800 text-secondaryDark"
            />

            <HoppButtonSecondary
              :icon="IconTrash"
              label="Revoke Invitation"
              class="py-4 border-divider rounded-l-none hover:bg-red-500"
              @click="confirmDeletion = true"
            />
          </div>
        </div>

        <div v-if="invitedUsers?.length === 0">{{ t('users.no_invite') }}</div>
      </div>
    </div>
    <HoppSmartConfirmModal
      :show="confirmDeletion"
      :title="t('state.confirm_delete_invites')"
      @hide-modal="confirmDeletion = false"
      @resolve="deleteUserInvitation(inviteToBeDeleted)"
    />
  </div>
</template>

<script setup lang="ts">
import { useMutation, useQuery } from '@urql/vue';
import { format } from 'date-fns';
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from '~/composables/i18n';
import { useToast } from '~/composables/toast';
import IconTrash from '~icons/lucide/trash';
import {
  InvitedUsersDocument,
  InvitedUsersQuery,
  RevokeUserInvitationsByAdminDocument,
} from '../../helpers/backend/graphql';

const t = useI18n();
const toast = useToast();
const router = useRouter();

// Get Proper Date Formats
const getCreatedDate = (date: string) => format(new Date(date), 'dd-MM-yyyy');
const getCreatedTime = (date: string) => format(new Date(date), 'hh:mm a');

// Get Invited Users
const { fetching, error, data } = useQuery({ query: InvitedUsersDocument });

// Table Headings
const headings = [
  { key: 'adminUid', label: t('users.admin_id') },
  { key: 'adminEmail', label: t('users.admin_email') },
  { key: 'inviteeEmail', label: t('users.invitee_email') },
  { key: 'invitedOn', label: t('users.invited_on') },
  { key: 'action', label: 'Action' },
];

// Selected Rows
const selectedRows = ref<InvitedUsersQuery['infra']['invitedUsers']>([]);

// Invited Users
const invitedUsers = computed({
  get: () => data.value?.infra.invitedUsers,
  set: (value) => {
    if (!value) return;
    data.value!.infra.invitedUsers = value;
  },
});

// Delete Invite
const confirmDeletion = ref(false);
const inviteToBeDeleted = ref<string | null>(null);
const deleteInvitationMutation = useMutation(
  RevokeUserInvitationsByAdminDocument
);

const deleteInvite = (inviteeEmail: string | null) => {
  confirmDeletion.value = true;
  inviteToBeDeleted.value = inviteeEmail;
};

const deleteUserInvitation = async (inviteeEmail: string | null) => {
  const inviteeEmails = inviteeEmail
    ? [inviteeEmail]
    : selectedRows.value.map((row) => row.inviteeEmail);

  const variables = { inviteeEmails };
  const result = await deleteInvitationMutation.executeMutation(variables);
  if (result.error) {
    toast.error(t('state.delete_invite_failure'));
  } else {
    invitedUsers.value = invitedUsers.value?.filter(
      (user) => !inviteeEmails.includes(user.inviteeEmail)
    );
    selectedRows.value.splice(0, selectedRows.value.length);
    toast.success(t('state.delete_invite_success'));
  }

  confirmDeletion.value = false;
  inviteToBeDeleted.value = null;
};
</script>
