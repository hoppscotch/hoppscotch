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
      <div class="overflow-x-auto mb-5">
        <div class="mb-3 flex items-center justify-end">
          <HoppButtonSecondary
            outline
            filled
            :icon="IconLeft"
            :disabled="page === 1"
            @click="changePage(PageDirection.Previous)"
          />

          <div class="flex h-full w-10 items-center justify-center">
            <span>{{ page }}</span>
          </div>

          <HoppButtonSecondary
            outline
            filled
            :icon="IconRight"
            :disabled="page >= totalPages"
            @click="changePage(PageDirection.Next)"
          />
        </div>

        <HoppSmartTable
          v-model:list="finalUsersList"
          v-model:selected-rows="selectedRows"
          :headings="headings"
          :loading="showSpinner"
          @onRowClicked="goToUserDetails"
        >
          <template #extension>
            <div class="flex w-full items-center bg-primary">
              <icon-lucide-search class="mx-3 text-xs" />
              <HoppSmartInput
                v-model="query"
                styles="w-full bg-primary py-1"
                input-styles="h-full border-none"
                :placeholder="t('users.searchbar_placeholder')"
              />
            </div>
          </template>
          <template #head>
            <th class="px-6 py-2">{{ t('users.id') }}</th>
            <th class="px-6 py-2">{{ t('users.name') }}</th>
            <th class="px-6 py-2">{{ t('users.email') }}</th>
            <th class="px-6 py-2">{{ t('users.date') }}</th>
            <!-- Empty header for Action Button -->
            <th class="w-20 px-6 py-2"></th>
          </template>

          <template #empty-state>
            <td colspan="6">
              <span class="flex justify-center p-3">
                {{ error ? t('users.load_list_error') : t('users.no_users') }}
              </span>
            </td>
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

            <td class="py-2 px-7 truncate">
              {{ user.email }}
            </td>

            <td class="py-2 px-7">
              {{ getCreatedDate(user.createdOn) }}
              <div class="text-gray-400 text-tiny">
                {{ getCreatedTime(user.createdOn) }}
              </div>
            </td>

            <td @click.stop class="flex justify-end w-20">
              <div class="mt-2 mr-5">
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
                              ? confirmAdminToUser(user.uid)
                              : confirmUserToAdmin(user.uid);
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
                            confirmUserDeletion(user.uid);
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
        </HoppSmartTable>

        <!-- Actions for Selected Rows -->
        <div
          v-if="selectedRows.length"
          class="fixed m-2 bottom-0 left-40 right-0 w-min mx-auto shadow-2xl"
        >
          <div
            class="flex justify-center items-end bg-primaryLight border border-divider rounded-md mb-5"
          >
            <HoppButtonSecondary
              :icon="IconCheck"
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
              class="py-4 border-divider rounded-none hover:bg-red-500"
              @click="confirmUsersDeletion = true"
            />
            <HoppButtonSecondary
              :icon="IconX"
              :label="t('state.clear_selection')"
              class="py-4 border-divider rounded-l-none text-secondaryDark bg-red-600 hover:bg-red-500"
              @click="selectedRows.splice(0, selectedRows.length)"
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
        areMultipleUsersSelected
          ? t('state.confirm_users_to_admin')
          : t('state.confirm_user_to_admin')
      "
      @hide-modal="resetConfirmUserToAdmin"
      @resolve="makeUsersToAdmin(usersToAdminUID)"
    />
    <HoppSmartConfirmModal
      :show="confirmAdminsToUsers"
      :title="
        areMultipleUsersSelectedToAdmin
          ? t('state.confirm_admins_to_users')
          : t('state.confirm_admin_to_user')
      "
      @hide-modal="resetConfirmAdminToUser"
      @resolve="makeAdminsToUsers(adminsToUserUID)"
    />
    <HoppSmartConfirmModal
      :show="confirmUsersDeletion"
      :title="
        areMultipleUsersSelectedForDeletion
          ? t('state.confirm_users_deletion')
          : t('state.confirm_user_deletion')
      "
      @hide-modal="resetConfirmUserDeletion"
      @resolve="deleteUsers(deleteUserUID)"
    />
  </div>
</template>

<script setup lang="ts">
import { useMutation, useQuery } from '@urql/vue';
import { format } from 'date-fns';
import { computed, onUnmounted, ref, watch } from 'vue';
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
  ONLY_ONE_ADMIN_ACCOUNT_FOUND,
  USER_ALREADY_INVITED,
} from '~/helpers/errors';
import { handleUserDeletion } from '~/helpers/userManagement';
import IconCheck from '~icons/lucide/check';
import IconLeft from '~icons/lucide/chevron-left';
import IconRight from '~icons/lucide/chevron-right';
import IconMoreHorizontal from '~icons/lucide/more-horizontal';
import IconTrash from '~icons/lucide/trash';
import IconUserCheck from '~icons/lucide/user-check';
import IconUserMinus from '~icons/lucide/user-minus';
import IconAddUser from '~icons/lucide/user-plus';
import IconX from '~icons/lucide/x';

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
  { key: '', label: '' },
];

// Get Paginated Results of all the users in the infra
const usersPerPage = 20;
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

// Selected Rows
const selectedRows = ref<UsersListQuery['infra']['allUsers']>([]);

// Ensure this variable is declared outside the debounce function
let debounceTimeout: ReturnType<typeof setTimeout> | null = null;

onUnmounted(() => {
  if (debounceTimeout) {
    clearTimeout(debounceTimeout);
  }
});

// Debounce Function
const debounce = (func: () => void, delay: number) => {
  if (debounceTimeout) clearTimeout(debounceTimeout);
  debounceTimeout = setTimeout(func, delay);
};

// Search

const query = ref('');
// Query which is sent to the backend after debouncing
const searchQuery = ref('');

const handleSearch = async (input: string) => {
  searchQuery.value = input;

  if (input.length === 0) {
    await refetch({
      searchString: '',
      take: usersPerPage,
      skip: (page.value - 1) * usersPerPage,
    });
  } else {
    // If search query is present, fetch all the users filtered by the search query
    await refetch({ searchString: input, take: usersCount.value!, skip: 0 });
  }

  // Reset the page to 1 when the search query changes
  page.value = 1;
};

watch(query, () => {
  if (query.value.length === 0) {
    handleSearch(query.value);
  } else {
    debounce(() => {
      handleSearch(query.value);
    }, 500);
  }
});

// Final Users List after Search and Pagination operations
const finalUsersList = computed(() =>
  // If search query is present, filter the list based on the search query and return the paginated results
  // Else just return the paginated results directly
  searchQuery.value.length > 0
    ? usersList.value.slice(
        (page.value - 1) * usersPerPage,
        page.value * usersPerPage
      )
    : usersList.value
);

// Spinner
const showSpinner = ref(false);

watch(fetching, (fetching) => {
  if (fetching) {
    showSpinner.value = true;
    debounce(() => {
      showSpinner.value = false;
    }, 500);
  }
});

// Pagination
enum PageDirection {
  Previous,
  Next,
}

const page = ref(1);
const { data } = useQuery({ query: MetricsDocument });
const usersCount = computed(() => data?.value?.infra.usersCount);

const changePage = (direction: PageDirection) => {
  const isPrevious = direction === PageDirection.Previous;

  const isValidPreviousAction = isPrevious && page.value > 1;
  const isValidNextAction = !isPrevious && page.value < totalPages.value;

  if (isValidNextAction || isValidPreviousAction) {
    page.value += isPrevious ? -1 : 1;
  }
};

const totalPages = computed(() => {
  if (!usersCount.value) return 0;
  if (query.value.length > 0) {
    return Math.ceil(usersList.value.length / usersPerPage);
  }
  return Math.ceil(usersCount.value / usersPerPage);
});

watch(page, async () => {
  if (page.value < 1 || page.value > totalPages.value) {
    return;
  }
  // Show spinner when moving to a different page when search query is present
  else if (query.value.length > 0) {
    showSpinner.value = true;
    debounce(() => (showSpinner.value = false), 500);
  } else {
    await refetch({
      searchString: '',
      take: usersPerPage,
      skip: (page.value - 1) * usersPerPage,
    });
  }
});

// Go to Individual User Details Page
const router = useRouter();
const goToUserDetails = (user: UserInfoQuery['infra']['userInfo']) =>
  router.push('/users/' + user.uid);

// Send Invitation through Email
const showInviteUserModal = ref(false);
const sendInvitation = useMutation(InviteNewUserDocument);

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

const areMultipleUsersSelected = computed(() => selectedRows.value.length > 1);

const confirmUserToAdmin = (id: string | null) => {
  confirmUsersToAdmin.value = true;
  usersToAdminUID.value = id;
};

// Resets variables if user cancels the confirmation
const resetConfirmUserToAdmin = () => {
  confirmUsersToAdmin.value = false;
  usersToAdminUID.value = null;
};

const makeUsersToAdmin = async (id: string | null) => {
  const userUIDs = id ? [id] : selectedRows.value.map((user) => user.uid);
  const variables = { userUIDs };
  const result = await usersToAdmin.executeMutation(variables);

  if (result.error) {
    toast.error(
      areMultipleUsersSelected.value
        ? t('state.users_to_admin_failure')
        : t('state.admin_failure')
    );
  } else {
    toast.success(
      areMultipleUsersSelected.value
        ? t('state.users_to_admin_success')
        : t('state.admin_success')
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
const confirmAdminsToUsers = ref(false);
const adminsToUserUID = ref<string | null>(null);
const adminsToUser = useMutation(DemoteUsersByAdminDocument);

const confirmAdminToUser = (id: string | null) => {
  confirmAdminsToUsers.value = true;
  adminsToUserUID.value = id;
};

// Resets variables if user cancels the confirmation
const resetConfirmAdminToUser = () => {
  confirmAdminsToUsers.value = false;
  adminsToUserUID.value = null;
};

const areMultipleUsersSelectedToAdmin = computed(
  () => selectedRows.value.length > 1
);

const makeAdminsToUsers = async (id: string | null) => {
  const userUIDs = id ? [id] : selectedRows.value.map((user) => user.uid);

  const variables = { userUIDs };
  const result = await adminsToUser.executeMutation(variables);
  if (result.error) {
    if (result.error.message === ONLY_ONE_ADMIN_ACCOUNT_FOUND) {
      return toast.error(t('state.remove_admin_failure_only_one_admin'));
    }

    toast.error(
      areMultipleUsersSelected.value
        ? t('state.remove_admin_from_users_failure')
        : t('state.remove_admin_failure')
    );
  } else {
    toast.success(
      areMultipleUsersSelected.value
        ? t('state.remove_admin_from_users_success')
        : t('state.remove_admin_success')
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
const confirmUsersDeletion = ref(false);
const deleteUserUID = ref<string | null>(null);
const usersDeletion = useMutation(RemoveUsersByAdminDocument);

const confirmUserDeletion = (id: string | null) => {
  confirmUsersDeletion.value = true;
  deleteUserUID.value = id;
};

// Resets variables if user cancels the confirmation
const resetConfirmUserDeletion = () => {
  confirmUsersDeletion.value = false;
  deleteUserUID.value = null;
};

const areMultipleUsersSelectedForDeletion = computed(
  () => selectedRows.value.length > 1
);

const deleteUsers = async (id: string | null) => {
  const userUIDs = id ? [id] : selectedRows.value.map((user) => user.uid);
  const variables = { userUIDs };
  const result = await usersDeletion.executeMutation(variables);

  if (result.error) {
    const errorMessage = areMultipleUsersSelected.value
      ? t('state.delete_users_failure')
      : t('state.delete_user_failure');
    toast.error(errorMessage);
  } else {
    const deletedUsers = result.data?.removeUsersByAdmin || [];
    const deletedUserIDs = deletedUsers
      .filter((user) => user.isDeleted)
      .map((user) => user.userUID);

    handleUserDeletion(deletedUsers);

    usersList.value = usersList.value.filter(
      (user) => !deletedUserIDs.includes(user.uid)
    );

    selectedRows.value.splice(0, selectedRows.value.length);
  }
  confirmUsersDeletion.value = false;
  deleteUserUID.value = null;
};
</script>
