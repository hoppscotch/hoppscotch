<template>
  <div class="flex flex-col">
    <!-- Table View for All Users -->
    <div class="flex flex-col">
      <h1 class="text-lg font-bold text-secondaryDark">
        {{ t('users.users') }}
      </h1>
      <div class="flex items-center space-x-4 mt-10 mb-5">
        <HoppButtonPrimary
          :label="t('users.invite_user')"
          @click="showInviteUserModal = true"
          :icon="IconAddUser"
        />
        <div class="flex">
          <HoppButtonSecondary
            outline
            filled
            label="Pending Invites"
            :to="'/users/invited'"
          />
        </div>
      </div>
      <div class="overflow-x-auto">
        <!-- <div v-if="fetching" class="w-5 h-5 text-center mx-auto">
          <HoppSmartSpinner />
        </div> -->

        <!-- <div v-else-if="error">{{ t('users.load_list_error') }}</div> -->

        <UsersTable
          v-if="usersList.length >= 0"
          :headings="headings"
          :list="usersList"
          :checkbox="true"
          :selected-rows="selectedRows"
          :search-bar="{
            debounce: 1000,
            placeholder: 'Search by name or email..',
          }"
          :pagination="{ totalPages: totalPages }"
          @onRowClicked="goToUserDetails"
          @search="handleInput"
          @pageNumber="handlePageChange"
          class="w-full h-full"
        >
          <template #head>
            <th class="px-6 py-2">{{ t('users.id') }}</th>
            <th class="px-6 py-2">{{ t('users.name') }}</th>
            <th class="px-6 py-2">{{ t('users.email') }}</th>
            <th class="px-6 py-2">{{ t('users.date') }}</th>
            <!-- Empty header for Action Button -->
            <th class="px-6 py-2"></th>
          </template>

          <template #body="{ row: user }">
            <td class="py-2 px-7 max-w-[8rem] truncate">
              {{ user.uid }}
            </td>

            <td class="py-2 px-7">
              <div class="flex items-center space-x-2">
                <span>
                  {{ user.displayName ?? t('users.unnamed') }}
                </span>

                <span
                  v-if="user.isAdmin"
                  class="text-xs font-medium px-3 py-0.5 rounded-full bg-green-900 text-green-300"
                >
                  {{ t('users.admin') }}
                </span>
              </div>
            </td>

            <td class="py-2 px-7">
              {{ user.email }}
            </td>

            <td class="py-2 px-7">
              {{ getCreatedDate(user.createdOn) }}
              <div class="text-gray-400 text-tiny">
                {{ getCreatedTime(user.createdOn) }}
              </div>
            </td>

            <td @click.stop>
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
                        :icon="user.isAdmin ? IconUserMinus : IconUserCheck"
                        :label="
                          user.isAdmin
                            ? t('users.remove_admin_status')
                            : t('users.make_admin')
                        "
                        class="!hover:bg-emerald-600"
                        @click="
                          () => {
                            user.isAdmin
                              ? makeAdminToUser(user.uid)
                              : makeUserAdmin(user.uid);
                            hide();
                          }
                        "
                      />
                      <HoppSmartItem
                        v-if="!user.isAdmin"
                        :icon="IconTrash"
                        :label="t('users.delete_user')"
                        class="!hover:bg-red-600"
                        @click="
                          () => {
                            deleteUser(user.uid);
                            hide();
                          }
                        "
                      />
                    </div>
                  </template>
                </tippy>
              </div>
            </td>
          </template>
        </UsersTable>

        <!-- <div
          v-if="fetchQuery"
          class="w-full border-x-2 border-b-2 border-divider text-center p-3 rounded-b-md"
        >
          No users found...
        </div> -->

        <div
          v-if="selectedRows.length"
          class="fixed m-2 bottom-0 left-32 right-0 w-min mx-auto shadow-2xl"
        >
          <div
            class="flex justify-center items-end bg-primaryLight border border-divider rounded-md mb-5"
          >
            <HoppButtonSecondary
              :label="`${selectedRows.length} selected`"
              class="py-4 border-divider rounded-r-none bg-emerald-800 text-secondaryDark"
            />
            <HoppButtonSecondary
              :icon="IconUserCheck"
              label="Make Admin"
              class="py-4 border-divider border-r-1 rounded-none hover:bg-emerald-600"
              @click="confirmUsersToAdmin = true"
            />
            <HoppButtonSecondary
              :icon="IconUserMinus"
              label="Remove Admin"
              class="py-4 border-divider border-r-1 rounded-none hover:bg-orange-500"
              @click="confirmAdminsToUsers = true"
            />
            <HoppButtonSecondary
              :icon="IconTrash"
              label="Delete User"
              class="py-4 border-divider rounded-l-none hover:bg-red-500"
              @click="confirmUsersDeletion = true"
            />
          </div>
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
    <HoppSmartConfirmModal
      :show="confirmUsersToAdmin"
      :title="t('users.confirm_user_to_admin')"
      @hide-modal="confirmUsersToAdmin = false"
      @resolve="makeUsersToAdmin"
    />
    <HoppSmartConfirmModal
      :show="confirmAdminsToUsers"
      :title="t('users.confirm_admin_to_user')"
      @hide-modal="confirmAdminsToUsers = false"
      @resolve="makeAdminsToUsers"
    />
    <HoppSmartConfirmModal
      :show="confirmUsersDeletion"
      :title="t('users.confirm_user_deletion')"
      @hide-modal="confirmUsersDeletion = false"
      @resolve="deleteUsers"
    />
  </div>
</template>

<script setup lang="ts">
import { useMutation } from '@urql/vue';
import { format } from 'date-fns';
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useQuery } from '@urql/vue';
import { useI18n } from '~/composables/i18n';
import { useToast } from '~/composables/toast';
import { usePagedQuery } from '~/composables/usePagedQuery';
import IconMoreHorizontal from '~icons/lucide/more-horizontal';
import IconTrash from '~icons/lucide/trash';
import IconUserCheck from '~icons/lucide/user-check';
import IconUserMinus from '~icons/lucide/user-minus';
import IconAddUser from '~icons/lucide/user-plus';
import {
  InviteNewUserDocument,
  MakeUserAdminDocument,
  MakeUsersAdminDocument,
  MetricsDocument,
  RemoveUserAsAdminDocument,
  RemoveUsersAsAdminDocument,
  RemoveUserByAdminDocument,
  RemoveUsersByAdminDocument,
  UsersListV2Document,
  UsersListQuery,
  UserInfoQuery,
} from '~/helpers/backend/graphql';

// Get Proper Date Formats
const t = useI18n();
const toast = useToast();

const getCreatedDate = (date: string) => format(new Date(date), 'dd-MM-yyyy');
const getCreatedTime = (date: string) => format(new Date(date), 'hh:mm a');

// Table Headings
const headings = [
  { key: 'uid', label: t('users.id') },
  { key: 'displayName', label: t('users.name') },
  { key: 'email', label: t('users.email') },
  { key: 'createdOn', label: t('users.date') },
];

// Get Paginated Results of all the users in the infra
const usersPerPage = 2;
const {
  fetching,
  error,
  refetch,
  list: usersList,
} = usePagedQuery(
  UsersListV2Document,
  (x) => x.infra.allUsersV2,
  usersPerPage,
  { searchString: '', take: usersPerPage, skip: 0 }
);

const selectedRows = ref<UsersListQuery['infra']['allUsers']>([]);

// Search

const searchQuery = ref('');
const handleInput = async (input: string) => {
  searchQuery.value = input;
  await refetch({ searchString: input, take: usersPerPage, skip: 0 });
};

// Pagination
const { data } = useQuery({ query: MetricsDocument });
const usersCount = computed(() => data?.value?.infra.usersCount);

const totalPages = computed(() => {
  if (!usersCount.value) return 0;
  if (searchQuery.value.length > 0) {
    return usersList.value.length;
  }
  return Math.ceil(usersCount.value / usersPerPage);
});

const handlePageChange = async (page: number) => {
  if (page < 1 || page > totalPages.value) {
    return;
  } else {
    await refetch({
      searchString: searchQuery.value,
      take: usersPerPage,
      skip: (page - 1) * usersPerPage,
    });
  }
};

// Send Invitation through Email
const sendInvitation = useMutation(InviteNewUserDocument);
const showInviteUserModal = ref(false);

const sendInvite = async (email: string) => {
  if (!email.trim()) {
    toast.error(t('state.invalid_email'));
    return;
  }
  const variables = { inviteeEmail: email.trim() };
  const result = await sendInvitation.executeMutation(variables);
  if (result.error) {
    toast.error(t('state.email_failure'));
  } else {
    toast.success(t('state.email_success'));
    showInviteUserModal.value = false;
  }
};

// Go to Individual User Details Page
const router = useRouter();
const goToUserDetails = (user: UserInfoQuery['infra']['userInfo']) =>
  router.push('/users/' + user.uid);

// User Deletion
const userDeletion = useMutation(RemoveUserByAdminDocument);
const confirmDeletion = ref(false);
const deleteUserUID = ref<string | null>(null);

const deleteUser = (id: string) => {
  confirmDeletion.value = true;
  deleteUserUID.value = id;
};

const deleteUserMutation = async (id: string | null) => {
  if (!id) {
    confirmDeletion.value = false;
    toast.error(t('state.delete_user_failure'));
    return;
  }
  const variables = { uid: id };
  const result = await userDeletion.executeMutation(variables);
  if (result.error) {
    toast.error(t('state.delete_user_failure'));
  } else {
    toast.success(t('state.delete_user_success'));
    usersList.value = usersList.value.filter((user) => user.uid !== id);
  }
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
    toast.error(t('state.admin_failure'));
    return;
  }
  const variables = { uid: id };
  const result = await userToAdmin.executeMutation(variables);
  if (result.error) {
    toast.error(t('state.admin_failure'));
  } else {
    toast.success(t('state.admin_success'));
    usersList.value = usersList.value.map((user) => ({
      ...user,
      isAdmin: user.uid === id ? true : user.isAdmin,
    }));
  }
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

const makeAdminToUserMutation = async (id: string | null) => {
  if (!id) {
    confirmAdminToUser.value = false;
    toast.error(t('state.remove_admin_failure'));
    return;
  }
  const variables = { uid: id };
  const result = await adminToUser.executeMutation(variables);
  if (result.error) {
    toast.error(t('state.remove_admin_failure'));
  } else {
    toast.success(t('state.remove_admin_success'));
    usersList.value = usersList.value.map((user) => ({
      ...user,
      isAdmin: user.uid === id ? false : user.isAdmin,
    }));
  }
  confirmAdminToUser.value = false;
  adminToUserUID.value = null;
};

const usersToAdmin = useMutation(MakeUsersAdminDocument);
const confirmUsersToAdmin = ref(false);

const makeUsersToAdmin = async () => {
  const userUIDs = selectedRows.value.map((user) => user.uid);

  console.log(selectedRows.value);

  const variables = { userUIDs };
  const result = await usersToAdmin.executeMutation(variables);
  if (result.error) {
    toast.error(t('state.admin_failure'));
  } else {
    toast.success(t('state.admin_success'));
    usersList.value = usersList.value.map((user) => ({
      ...user,
      isAdmin: userUIDs.includes(user.uid) ? true : user.isAdmin,
    }));
    console.log(selectedRows.value);

    selectedRows.value.splice(0, selectedRows.value.length);
  }
  confirmUsersToAdmin.value = false;
};

const adminsToUser = useMutation(RemoveUsersAsAdminDocument);
const confirmAdminsToUsers = ref(false);

const makeAdminsToUsers = async () => {
  const userUIDs = selectedRows.value.map((user) => user.uid);

  const variables = { userUIDs };
  const result = await adminsToUser.executeMutation(variables);
  if (result.error) {
    toast.error(t('state.remove_admin_failure'));
  } else {
    toast.success(t('state.remove_admin_success'));
    usersList.value = usersList.value.map((user) => ({
      ...user,
      isAdmin: userUIDs.includes(user.uid) ? false : user.isAdmin,
    }));

    selectedRows.value.splice(0, selectedRows.value.length);
  }
  confirmAdminsToUsers.value = false;
};

const usersDeletion = useMutation(RemoveUsersByAdminDocument);
const confirmUsersDeletion = ref(false);

const deleteUsers = async () => {
  const userUIDs = selectedRows.value.map((user) => user.uid);

  const variables = { userUIDs };
  const result = await usersDeletion.executeMutation(variables);
  if (result.error) {
    toast.error(t('state.delete_user_failure'));
  } else {
    toast.success(t('state.delete_user_success'));
    usersList.value = usersList.value.filter(
      (user) => !userUIDs.includes(user.uid)
    );

    selectedRows.value.splice(0, selectedRows.value.length);
  }
  confirmUsersDeletion.value = false;
};
</script>
