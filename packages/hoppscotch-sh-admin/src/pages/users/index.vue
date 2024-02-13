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
            :label="t('users.pending_invites')"
            :to="'/users/invited'"
          />
        </div>
      </div>
      <div class="overflow-x-auto">
        <div v-if="error">{{ t('users.load_list_error') }}</div>

        <UsersTable
          v-if="usersList.length >= 0"
          :headings="headings"
          :list="usersList"
          :checkbox="true"
          :selected-rows="selectedRows"
          :search-bar="{
            debounce: 1000,
            placeholder: t('users.searchbar_placeholder'),
          }"
          :pagination="{ totalPages: totalPages }"
          @onRowClicked="goToUserDetails"
          @search="handleSearch"
          @pageNumber="handlePageChange"
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
                              ? makeAdminsUsers(user.uid)
                              : makeUsersAdmin(user.uid);
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

        <!-- Actions for Selected Rows -->
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
              :icon="IconUserCheck"
              :label="t('users.make_admin')"
              class="py-4 border-divider border-r-1 rounded-none hover:bg-emerald-600"
              @click="confirmUsersToAdmin = true"
            />
            <HoppButtonSecondary
              :icon="IconUserMinus"
              :label="t('users.remove_admin_status')"
              class="py-4 border-divider border-r-1 rounded-none hover:bg-orange-500"
              @click="confirmAdminsToUsers = true"
            />
            <HoppButtonSecondary
              :icon="IconTrash"
              :label="t('users.delete_users')"
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
      :show="confirmUsersToAdmin"
      :title="
        AreMultipleUsersSelected
          ? t('state.confirm_users_to_admin')
          : t('state.confirm_user_to_admin')
      "
      @hide-modal="confirmUsersToAdmin = false"
      @resolve="makeUsersToAdmin(usersToAdminUID)"
    />
    <HoppSmartConfirmModal
      :show="confirmAdminsToUsers"
      :title="
        AreMultipleUsersSelectedToAdmin
          ? t('state.confirm_admins_to_users')
          : t('state.confirm_admin_to_user')
      "
      @hide-modal="confirmAdminsToUsers = false"
      @resolve="makeAdminsToUsers(adminsToUserUID)"
    />
    <HoppSmartConfirmModal
      :show="confirmUsersDeletion"
      :title="
        AreMultipleUsersSelectedForDeletion
          ? t('state.confirm_users_deletion')
          : t('state.confirm_user_deletion')
      "
      @hide-modal="confirmUsersDeletion = false"
      @resolve="deleteUsers(deleteUserUID)"
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
import { usePagedQuery } from '~/composables/usePagedQuery';
import {
  DemoteUsersByAdminDocument,
  InviteNewUserDocument,
  MakeUsersAdminDocument,
  MetricsDocument,
  RemoveUsersByAdminDocument,
  UserInfoQuery,
  UsersListQuery,
  UsersListV2Document,
} from '~/helpers/backend/graphql';
import {
  DELETE_USER_FAILED_ONLY_ONE_ADMIN,
  USER_ALREADY_INVITED,
} from '~/helpers/errors';
import IconMoreHorizontal from '~icons/lucide/more-horizontal';
import IconTrash from '~icons/lucide/trash';
import IconUserCheck from '~icons/lucide/user-check';
import IconUserMinus from '~icons/lucide/user-minus';
import IconAddUser from '~icons/lucide/user-plus';

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
const usersPerPage = 20;
const {
  error,
  refetch,
  list: usersList,
} = usePagedQuery(
  UsersListV2Document,
  (x) => x.infra.allUsersV2,
  usersPerPage,
  { searchString: '', take: usersPerPage, skip: 0 }
);

// Selected Rows
const selectedRows = ref<UsersListQuery['infra']['allUsers']>([]);

// Search
const searchQuery = ref('');
const handleSearch = async (input: string) => {
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

// Go to Individual User Details Page
const router = useRouter();
const goToUserDetails = (user: UserInfoQuery['infra']['userInfo']) =>
  router.push('/users/' + user.uid);

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
    if (result.error.message === USER_ALREADY_INVITED)
      toast.error(t('state.user_already_invited'));
    else toast.error(t('state.email_failure'));
  } else {
    toast.success(t('state.email_success'));
    showInviteUserModal.value = false;
  }
};

// Make Multiple Users Admin
const confirmUsersToAdmin = ref(false);
const usersToAdminUID = ref<string | null>(null);
const usersToAdmin = useMutation(MakeUsersAdminDocument);

const AreMultipleUsersSelected = computed(
  () => usersToAdminUID.value === null && selectedRows.value.length > 0
);

const makeUsersAdmin = (id: string | null) => {
  confirmUsersToAdmin.value = true;
  usersToAdminUID.value = id;
};

const makeUsersToAdmin = async (id: string | null) => {
  const userUIDs = id ? [id] : selectedRows.value.map((user) => user.uid);
  const variables = { userUIDs };
  const result = await usersToAdmin.executeMutation(variables);

  if (result.error) {
    toast.error(
      id ? t('state.admin_failure') : t('state.users_to_admin_failure')
    );
  } else {
    toast.success(
      id ? t('state.admin_success') : t('state.users_to_admin_success')
    );
    usersList.value = usersList.value.map((user) => ({
      ...user,
      isAdmin: userUIDs.includes(user.uid) ? true : user.isAdmin,
    }));
    selectedRows.value.splice(0, selectedRows.value.length);
  }
  confirmUsersToAdmin.value = false;
  usersToAdminUID.value = null;
};

// Remove Admin Status from Multiple Users
const adminsToUser = useMutation(DemoteUsersByAdminDocument);
const confirmAdminsToUsers = ref(false);
const adminsToUserUID = ref<string | null>(null);

const makeAdminsUsers = (id: string | null) => {
  confirmAdminsToUsers.value = true;
  adminsToUserUID.value = id;
};

const AreMultipleUsersSelectedToAdmin = computed(
  () => adminsToUserUID.value === null && selectedRows.value.length > 0
);

const makeAdminsToUsers = async (id: string | null) => {
  const userUIDs = id ? [id] : selectedRows.value.map((user) => user.uid);

  const variables = { userUIDs };
  const result = await adminsToUser.executeMutation(variables);
  if (result.error) {
    toast.error(
      id
        ? t('state.remove_admin_failure')
        : t('state.remove_admin_from_users_failure')
    );
  } else {
    toast.success(
      id
        ? t('state.remove_admin_success')
        : t('state.remove_admin_from_users_success')
    );
    usersList.value = usersList.value.map((user) => ({
      ...user,
      isAdmin: userUIDs.includes(user.uid) ? false : user.isAdmin,
    }));

    selectedRows.value.splice(0, selectedRows.value.length);
  }
  confirmAdminsToUsers.value = false;
  adminsToUserUID.value = null;
};

// Delete Multiple Users
const usersDeletion = useMutation(RemoveUsersByAdminDocument);
const confirmUsersDeletion = ref(false);
const deleteUserUID = ref<string | null>(null);

const deleteUser = (id: string | null) => {
  confirmUsersDeletion.value = true;
  deleteUserUID.value = id;
};

const AreMultipleUsersSelectedForDeletion = computed(
  () => deleteUserUID.value === null && selectedRows.value.length > 0
);

const deleteUsers = async (id: string | null) => {
  const userUIDs = id ? [id] : selectedRows.value.map((user) => user.uid);

  const variables = { userUIDs };
  const result = await usersDeletion.executeMutation(variables);
  if (result.error) {
    if (result.error.message === DELETE_USER_FAILED_ONLY_ONE_ADMIN) {
      toast.error(t('state.delete_user_failed_only_one_admin'));
    } else {
      toast.error(
        id ? t('state.delete_user_failure') : t('state.delete_users_failure')
      );
    }
  } else {
    toast.success(
      id ? t('state.delete_user_success') : t('state.delete_users_success')
    );
    usersList.value = usersList.value.filter(
      (user) => !userUIDs.includes(user.uid)
    );
    selectedRows.value.splice(0, selectedRows.value.length);
  }
  confirmUsersDeletion.value = false;
  deleteUserUID.value = null;
};
</script>
