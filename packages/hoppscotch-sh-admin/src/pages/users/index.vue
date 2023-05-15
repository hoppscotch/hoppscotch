<template>
  <div class="flex flex-col">
    <!-- Table View for All Users -->
    <div class="flex flex-col">
      <h1 class="text-lg font-bold text-secondaryDark">
        {{ t('users.users') }}
      </h1>
      <div class="flex items-center space-x-4 py-10">
        <HoppButtonPrimary
          :label="t('users.invite_user')"
          @click="showInviteUserModal = true"
          :icon="IconAddUser"
        />

        <div class="flex">
          <HoppButtonSecondary
            outline
            filled
            :label="t('users.invited_users')"
            :to="'/users/invited'"
          />
        </div>
      </div>
      <div class="overflow-x-auto">
        <div
          v-if="fetching && !error && usersList.length === 0"
          class="flex justify-center"
        >
          <HoppSmartSpinner />
        </div>

        <div v-else-if="error">{{ t('users.load_list_error') }}</div>

        <UsersTable
          v-else-if="usersList.length >= 1"
          :usersList="usersList"
          :fetching="fetching"
          :error="error"
          @goToUserDetails="goToUserDetails"
          @makeUserAdmin="makeUserAdmin"
          @makeAdminToUser="makeAdminToUser"
          @deleteUser="deleteUser"
        />

        <div v-else class="flex justify-center">{{ t('users.no_users') }}</div>

        <div
          v-if="hasNextPage && usersList.length >= usersPerPage"
          class="flex justify-center my-5 px-3 py-2 cursor-pointer font-semibold rounded-3xl bg-dividerDark hover:bg-divider transition mx-auto w-38 text-secondaryDark"
          @click="fetchNextUsers"
        >
          <span>{{ t('users.show_more') }}</span>
          <icon-lucide-chevron-down class="ml-2 text-lg" />
        </div>
      </div>
    </div>

    <UsersInviteModal
      :show="showInviteUserModal"
      @hide-modal="showInviteUserModal = false"
      @send-invite="sendInvite"
    />
    <HoppSmartConfirmModal
      :show="confirmDeletion"
      :title="t('users.confirm_user_deletion')"
      @hide-modal="confirmDeletion = false"
      @resolve="deleteUserMutation(deleteUserUID)"
    />
    <HoppSmartConfirmModal
      :show="confirmUserToAdmin"
      :title="t('users.confirm_user_to_admin')"
      @hide-modal="confirmUserToAdmin = false"
      @resolve="makeUserAdminMutation(userToAdminUID)"
    />
    <HoppSmartConfirmModal
      :show="confirmAdminToUser"
      :title="t('users.confirm_admin_to_user')"
      @hide-modal="confirmAdminToUser = false"
      @resolve="makeAdminToUserMutation(adminToUserUID)"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useMutation } from '@urql/vue';
import {
  InviteNewUserDocument,
  MakeUserAdminDocument,
  RemoveUserByAdminDocument,
  RemoveUserAsAdminDocument,
  UsersListDocument,
} from '../../helpers/backend/graphql';
import { usePagedQuery } from '~/composables/usePagedQuery';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from '~/composables/toast';
import { HoppButtonSecondary } from '@hoppscotch/ui';
import IconAddUser from '~icons/lucide/user-plus';
import { useI18n } from '~/composables/i18n';

const t = useI18n();

const toast = useToast();

// Get Paginated Results of all the users in the infra
const usersPerPage = 20;
const {
  fetching,
  error,
  goToNextPage: fetchNextUsers,
  list: usersList,
  hasNextPage,
} = usePagedQuery(
  UsersListDocument,
  (x) => x.admin.allUsers,
  (x) => x.uid,
  usersPerPage,
  { cursor: undefined, take: usersPerPage }
);

// Send Invitation through Email
const sendInvitation = useMutation(InviteNewUserDocument);
const showInviteUserModal = ref(false);

const sendInvite = async (email: string) => {
  if (!email.trim()) {
    toast.error(`${t('state.invalid_email')}`);
    return;
  }
  const variables = { inviteeEmail: email.trim() };
  await sendInvitation.executeMutation(variables).then((result) => {
    if (result.error) {
      toast.error(`${t('state.email_failure')}`);
    } else {
      toast.success(`${t('state.email_success')}`);
      showInviteUserModal.value = false;
    }
  });
};

// Go to Individual User Details Page
const route = useRoute();
const router = useRouter();
const goToUserDetails = (uid: string) => {
  router.push('/users/' + uid);
};

watch(
  () => route.params.id,
  () => window.location.reload()
);

// User Deletion
const userDeletion = useMutation(RemoveUserByAdminDocument);
const confirmDeletion = ref(false);
const deleteUserUID = ref<string | null>(null);

const deleteUserMutation = async (id: string | null) => {
  if (!id) {
    confirmDeletion.value = false;
    toast.error(`${t('state.delete_user_failure')}`);
    return;
  }
  const variables = { uid: id };
  await userDeletion.executeMutation(variables).then((result) => {
    if (result.error) {
      toast.error(`${t('state.delete_user_failure')}`);
    } else {
      toast.success(`${t('state.delete_user_success')}`);
      usersList.value = usersList.value.filter((user) => user.uid !== id);
    }
  });
  confirmDeletion.value = false;
  deleteUserUID.value = null;
};

// Make User Admin
const userToAdmin = useMutation(MakeUserAdminDocument);
const confirmUserToAdmin = ref(false);
const userToAdminUID = ref<string | null>(null);

const makeUserAdmin = (id: string) => {
  confirmUserToAdmin.value = true;
  userToAdminUID.value = id;
};

const makeUserAdminMutation = async (id: string | null) => {
  if (!id) {
    confirmUserToAdmin.value = false;
    toast.error(`${t('state.admin_failure')}`);
    return;
  }
  const variables = { uid: id };
  await userToAdmin.executeMutation(variables).then((result) => {
    if (result.error) {
      toast.error(`${t('state.admin_failure')}`);
    } else {
      toast.success(`${t('state.admin_success')}`);
      usersList.value = usersList.value.map((user) => {
        if (user.uid === id) {
          user.isAdmin = true;
        }
        return user;
      });
    }
  });
  confirmUserToAdmin.value = false;
  userToAdminUID.value = null;
};

// Remove Admin Status from a current Admin
const adminToUser = useMutation(RemoveUserAsAdminDocument);
const confirmAdminToUser = ref(false);
const adminToUserUID = ref<string | null>(null);

const makeAdminToUser = (id: string) => {
  confirmAdminToUser.value = true;
  adminToUserUID.value = id;
};

const deleteUser = (id: string) => {
  confirmDeletion.value = true;
  deleteUserUID.value = id;
};

const makeAdminToUserMutation = async (id: string | null) => {
  if (!id) {
    confirmAdminToUser.value = false;
    toast.error(`${t('state.remove_admin_failure')}`);
    return;
  }
  const variables = { uid: id };
  await adminToUser.executeMutation(variables).then((result) => {
    if (result.error) {
      toast.error(`${t('state.remove_admin_failure')}`);
    } else {
      toast.success(`${t('state.remove_admin_success')}`);
      usersList.value = usersList.value.map((user) => {
        if (user.uid === id) {
          user.isAdmin = false;
        }
        return user;
      });
    }
  });
  confirmAdminToUser.value = false;
  adminToUserUID.value = null;
};
</script>
