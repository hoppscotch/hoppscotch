<template>
  <div class="flex flex-col">
    <div class="flex">
      <button class="p-2 rounded-3xl bg-divider" @click="router.push('/users')">
        <icon-lucide-arrow-left class="text-xl" />
      </button>
    </div>

    <h3 class="text-lg font-bold text-accentContrast pt-6">
      {{ t('users.invited_users') }}
    </h3>

    <div class="flex flex-col">
      <div class="py-2 overflow-x-auto">
        <div v-if="fetching" class="flex justify-center mt-2">
          <HoppSmartSpinner />
        </div>

        <div v-else-if="error" class="mt-2 ml-2 text-xl">
          {{ t('users.invite_load_list_error') }}
        </div>

        <HoppSmartTable
          class="mt-6"
          v-else-if="invitedUsers?.length"
          :list="invitedUsers"
        >
          <template #head>
            <tr
              class="text-secondary border-b border-dividerDark text-sm text-left bg-primaryLight"
            >
              <th
                v-for="heading in headings"
                :key="heading.key"
                class="px-6 py-2"
              >
                {{ heading.label }}
              </th>
            </tr>
          </template>

          <template #body="{ list }">
            <tr
              v-for="invites in list"
              :key="invites.uid"
              class="text-secondaryDark hover:bg-divider hover:cursor-pointer rounded-xl"
            >
              <td class="py-2 px-5 max-w-5 truncate">
                {{ invites.adminUid }}
              </td>

              <td class="py-2 px-7">
                {{ invites.adminEmail }}
              </td>

              <td class="py-2 px-7">
                {{ invites.inviteeEmail }}
              </td>

              <td class="py-2 px-7">
                {{ getCreatedDate(invites.invitedOn) }}
                <div class="text-gray-400 text-tiny">
                  {{ getCreatedTime(invites.invitedOn) }}
                </div>
              </td>

              <td class="my-auto">
                <HoppButtonSecondary
                  v-tippy="{ theme: 'tooltip' }"
                  title="Delete"
                  :icon="IconTrash"
                  color="red"
                  class="px-3"
                  @click="deleteInvite(invites.inviteeEmail)"
                />
              </td>
            </tr>
          </template>
        </HoppSmartTable>

        <div v-else class="ml-2 mt-2 text-md">{{ t('users.no_invite') }}</div>
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
  RevokeUserInvitationByAdminDocument,
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
  { key: 'actions', label: '' },
];

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
  RevokeUserInvitationByAdminDocument
);

const deleteInvite = (inviteeEmail: string) => {
  confirmDeletion.value = true;
  inviteToBeDeleted.value = inviteeEmail;
};

const deleteUserInvitation = async (inviteeEmail: string | null) => {
  if (!inviteeEmail) {
    confirmDeletion.value = false;
    toast.error(t('state.delete_invites_failure'));
    return;
  }
  const variables = { inviteeEmail };
  const result = await deleteInvitationMutation.executeMutation(variables);
  if (result.error) {
    toast.error(t('state.delete_invites_failure'));
  } else {
    invitedUsers.value = invitedUsers.value?.filter(
      (request) => request.inviteeEmail !== inviteeEmail
    );
    toast.success(t('state.delete_invites_success'));
  }

  confirmDeletion.value = false;
  inviteToBeDeleted.value = null;
};
</script>
