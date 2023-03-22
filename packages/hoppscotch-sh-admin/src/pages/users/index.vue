<template>
  <div>
    <h3 class="sm:px-6 p-4 text-3xl font-bold text-gray-200">Users</h3>

    <!-- Table View for All Users -->
    <div class="flex flex-col">
      <div class="pt-2 my-2 overflow-x-auto sm:-mx-6 sm:px-4 lg:-mx-8 lg:px-8">
        <div class="inline-block min-w-full overflow-hidden align-middle">
          <div class="sm:px-7 px-4 pt-4 pb-1">
            <div class="flex w-full items-center mb-7">
              <HoppButtonPrimary
                class="mr-4"
                label="Invite a User"
                @click="showInviteUserModal = true"
              />

              <HoppButtonSecondary
                filled
                outline
                label="Invited Users"
                :to="'/users/invited'"
              />
            </div>
            <div>
              <div
                v-if="fetching && !error && !(usersList.length >= 1)"
                class="flex justify-center"
              >
                <HoppSmartSpinner />
              </div>
              <div v-else-if="error">Unable to Load Users List..</div>

              <table
                v-if="usersList.length >= 1"
                class="w-full text-left min-h-32"
              >
                <thead>
                  <tr
                    class="text-gray-200 border-b border-gray-600 text-sm font-bold"
                  >
                    <th class="px-3 pt-0 pb-3">User ID</th>
                    <th class="px-3 pt-0 pb-3">Name</th>
                    <th class="px-3 pt-0 pb-3">Email</th>
                    <th class="px-3 pt-0 pb-3">Date</th>
                    <th class="px-3 pt-0 pb-3"></th>
                  </tr>
                </thead>

                <tbody class="text-gray-300">
                  <tr
                    v-for="user in usersList"
                    :key="user.uid"
                    class="border-b border-gray-600 hover:bg-zinc-800 hover:cursor-pointer rounded-xl"
                  >
                    <td
                      @click="goToUserDetails(user)"
                      class="sm:p-3 py-2 px-1 max-w-30"
                    >
                      <div class="flex">
                        <span class="ml-3 truncate">
                          {{ user.uid }}
                        </span>
                      </div>
                    </td>

                    <td
                      @click="goToUserDetails(user)"
                      class="sm:p-3 py-2 px-1 0"
                    >
                      <div
                        v-if="user.displayName"
                        class="flex items-center ml-2"
                      >
                        {{ user.displayName }}
                        <span
                          v-if="user.isAdmin"
                          class="rounded-xl p-1 bg-emerald-300 bg-opacity-15 border-1 border-emerald-400 text-xs text-emerald-400 px-2 ml-2"
                        >
                          Admin
                        </span>
                      </div>
                      <div v-else class="flex items-center">
                        <span class="ml-2"> (Unnamed user) </span>
                        <span
                          v-if="user.isAdmin"
                          class="rounded-xl p-1 bg-emerald-300 bg-opacity-15 border-1 border-emerald-400 text-xs text-emerald-400 px-2 ml-2"
                        >
                          Admin
                        </span>
                      </div>
                    </td>

                    <td @click="goToUserDetails(user)" class="sm:p-3 py-2 px-1">
                      <span class="ml-2">
                        {{ user.email }}
                      </span>
                    </td>

                    <td @click="goToUserDetails(user)" class="sm:p-3 py-2 px-1">
                      <div class="flex items-center ml-2">
                        <div class="flex flex-col">
                          {{ getCreatedDate(user.createdOn) }}
                          <div class="text-gray-400 text-xs">
                            {{ getCreatedTime(user.createdOn) }}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td>
                      <div class="relative">
                        <button
                          @click.stop="toggleDropdown(user.uid)"
                          class="w-8 h-8 dropdown inline-flex items-center justify-end text-gray-400"
                        >
                          <icon-lucide-more-horizontal />
                        </button>

                        <transition
                          enter-active-class="transition duration-150 ease-out transform"
                          enter-from-class="scale-95 opacity-0"
                          enter-to-class="scale-100 opacity-100"
                          leave-active-class="transition duration-150 ease-in transform"
                          leave-from-class="scale-100 opacity-100"
                          leave-to-class="scale-95 opacity-0"
                        >
                          <div
                            v-show="activeUserId && activeUserId == user.uid"
                            class="absolute right-0 z-20 bg-zinc-800 rounded-md shadow-xl"
                          >
                            <HoppSmartItem
                              v-if="!user.isAdmin"
                              :icon="IconUserCheck"
                              :label="'Make Admin'"
                              class="!hover:bg-emerald-600 w-full"
                              @click="makeUserAdmin(user.uid)"
                            />
                            <HoppSmartItem
                              v-else
                              :icon="IconUserMinus"
                              :label="'Remove Admin Status'"
                              class="!hover:bg-emerald-600 w-full"
                              @click="makeAdminToUser(user.uid)"
                            />
                            <HoppSmartItem
                              v-if="!user.isAdmin"
                              :icon="IconTrash"
                              :label="'Delete User'"
                              class="!hover:bg-red-600 w-full"
                              @click="deleteUser(user.uid)"
                            />
                          </div>
                        </transition>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>

              <div
                v-if="hasNextPage"
                class="flex justify-center mt-5 p-2 font-semibold rounded-3xl bg-zinc-800 hover:bg-zinc-700 mx-auto w-32 text-light-500"
                @click="fetchNextUsers"
              >
                <span>Show more </span>
                <icon-lucide-chevron-down class="ml-2 text-lg" />
              </div>
              <div v-else class="mb-12 p-2"></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Send Invite Modal -->
    <HoppSmartModal
      v-if="showInviteUserModal"
      dialog
      title="Invite User"
      @close="showInviteUserModal = false"
    >
      <template #body>
        <div>
          <div>
            <div class="px-6 rounded-md">
              <div>
                <div class="my-4">
                  <div>
                    <label class="text-gray-200" for="emailAddress">
                      Email Address
                    </label>
                    <input
                      class="w-full p-3 mt-3 bg-zinc-800 border-gray-600 rounded-md focus:border-emerald-600 focus:ring focus:ring-opacity-40 focus:ring-emerald-500"
                      type="email"
                      v-model="email"
                      placeholder="Enter Email Address"
                    />
                  </div>
                </div>
                <div class="flex justify-end my-2 pt-3">
                  <HoppButtonPrimary
                    label="Send Invite"
                    @click="sendInvite()"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </HoppSmartModal>

    <HoppSmartConfirmModal
      :show="confirmDeletion"
      :title="`Confirm user deletion?`"
      @hide-modal="confirmDeletion = false"
      @resolve="deleteUserMutation(deleteUserUID)"
    />
    <HoppSmartConfirmModal
      :show="confirmUserToAdmin"
      :title="`Do you want to make this user into an admin?`"
      @hide-modal="confirmUserToAdmin = false"
      @resolve="makeUserAdminMutation(userToAdminUID)"
    />
    <HoppSmartConfirmModal
      :show="confirmAdminToUser"
      :title="`Do you want to remove admin status from this user?`"
      @hide-modal="confirmAdminToUser = false"
      @resolve="makeAdminToUserMutation(adminToUserUID)"
    />
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useMutation } from '@urql/vue';
import {
  InviteNewUserDocument,
  MakeUserAdminDocument,
  RemoveUserByAdminDocument,
  RemoveUserAsAdminDocument,
  UsersListDocument,
} from '../../helpers/backend/graphql';
import { usePagedQuery } from '../../composables/usePagedQuery';
import { format } from 'date-fns';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from '../../composables/toast';
import IconTrash from '~icons/lucide/trash';
import IconUserMinus from '~icons/lucide/user-minus';
import IconUserCheck from '~icons/lucide/user-check';

const toast = useToast();

// Get Proper Date Formats
const getCreatedDate = (date: string) => format(new Date(date), 'dd-MM-yyyy');
const getCreatedTime = (date: string) => format(new Date(date), 'hh:mm a');

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
const email = ref('');
const sendInvitation = useMutation(InviteNewUserDocument);
const showInviteUserModal = ref(false);

const sendInvite = async () => {
  const variables = { inviteeEmail: email.value.trim() };
  await sendInvitation.executeMutation(variables).then((result) => {
    if (result.error) {
      toast.error('Failed to send invitation!!');
    } else {
      toast.success('Email invitation sent successfully!!');
      showInviteUserModal.value = false;
    }
  });
};

// Go to Individual User Details Page
const route = useRoute();
const router = useRouter();
const goToUserDetails = (user: any) => {
  router.push('/users/' + user.uid);
};

// Open the side menu dropdown of only the selected user
const activeUserId = ref<null | String>(null);

function toggleDropdown(uid: String) {
  if (activeUserId.value && activeUserId.value == uid) {
    activeUserId.value = null;
  } else {
    activeUserId.value = uid;
  }
}

// Hide dropdown when user clicks elsewhere
const close = (e: any) => {
  if (!e.target.closest('.dropdown')) {
    activeUserId.value = null;
  }
};

onMounted(() => document.addEventListener('click', close));
onBeforeUnmount(() => document.removeEventListener('click', close));

// Reload Users Page when routed back to the users page
watch(
  () => route.params.id,
  () => window.location.reload()
);

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
    toast.error('User deletion failed!!');
    return;
  }
  const variables = { uid: id };
  await userDeletion.executeMutation(variables).then((result) => {
    if (result.error) {
      toast.error('User deletion failed!!');
    } else {
      toast.success('User deleted successfully!!');
      usersList.value = usersList.value.filter((user) => user.uid !== id);
      toggleDropdown(id);
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
    toast.error('Failed to make user an admin!!');
    return;
  }
  const variables = { uid: id };
  await userToAdmin.executeMutation(variables).then((result) => {
    if (result.error) {
      toast.error('Failed to make user an admin!!');
    } else {
      toast.success('User is now an admin!!');
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

const makeAdminToUserMutation = async (id: string | null) => {
  if (!id) {
    confirmAdminToUser.value = false;
    toast.error('Failed to remove admin status!!');
    return;
  }
  const variables = { uid: id };
  await adminToUser.executeMutation(variables).then((result) => {
    if (result.error) {
      toast.error('Failed to remove admin status!!');
    } else {
      toast.success('Admin status removed!!');
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
