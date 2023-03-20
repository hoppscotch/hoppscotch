<template>
  <div v-if="fetching" class="flex justify-center"><HoppSmartSpinner /></div>
  <div v-else>
    <div class="ml-3">
      <button
        class="p-2 mb-2 rounded-3xl bg-zinc-800"
        @click="router.push('/users')"
      >
        <icon-lucide-arrow-left class="text-xl" />
      </button>
    </div>
    <h3 class="sm:px-6 p-4 text-3xl font-bold text-gray-200">User Details</h3>

    <div>
      <div>
        <div class="px-6 rounded-md">
          <div class="grid gap-6 mt-4">
            <div v-if="user.photoURL" class="relative h-20 w-20">
              <img class="object-cover rounded-3xl mb-3" :src="user.photoURL" />
              <span
                v-if="user.isAdmin"
                class="absolute bottom-0 ml-17 rounded-xl p-1 bg-emerald-800 border-1 border-emerald-400 text-xs text-emerald-400 px-2"
              >
                Admin
              </span>
            </div>

            <div
              v-else
              class="bg-primaryDark w-17 p-3 rounded-2xl mb-3 relative"
            >
              <icon-lucide-user class="text-4xl" />
              <span
                v-if="user.isAdmin"
                class="absolute bottom-0 ml-11 rounded-xl p-1 bg-emerald-800 border-1 border-emerald-400 text-xs text-emerald-400 px-2"
              >
                Admin
              </span>
            </div>

            <div v-if="user.uid">
              <label class="text-gray-200" for="username">UID</label>
              <div
                class="w-full p-3 mt-2 bg-zinc-800 border-gray-600 rounded-md focus:border-emerald-600 focus:ring focus:ring-opacity-40 focus:ring-emerald-500"
              >
                {{ user.uid }}
              </div>
            </div>
            <div>
              <label class="text-gray-200" for="username">Name</label>
              <div
                class="w-full p-3 mt-2 bg-zinc-800 border-gray-600 rounded-md focus:border-emerald-600 focus:ring focus:ring-opacity-40 focus:ring-emerald-500"
              >
                <span v-if="user.displayName">
                  {{ user.displayName }}
                </span>
                <span v-else> (Unnamed user) </span>
              </div>
            </div>
            <div v-if="user.email">
              <label class="text-gray-200" for="username">Email</label>
              <div
                class="w-full p-3 mt-2 bg-zinc-800 border-gray-200 border-gray-600 rounded-md focus:border-emerald-600 focus:ring focus:ring-opacity-40 focus:ring-emerald-500"
              >
                {{ user.email }}
              </div>
            </div>
            <div v-if="user.createdOn">
              <label class="text-gray-200" for="username">Created On</label>
              <div
                class="w-full p-3 mt-2 bg-zinc-800 border-gray-600 rounded-md focus:border-emerald-600 focus:ring focus:ring-opacity-40 focus:ring-emerald-500"
              >
                {{ getCreatedDateAndTime(user.createdOn) }}
              </div>
            </div>
          </div>

          <div class="flex justify-start mt-8">
            <span v-if="!user.isAdmin">
              <HoppButtonPrimary
                class="mr-4"
                filled
                outline
                label="Make Admin"
                @click="makeUserAdmin(user.uid)"
              />
            </span>
            <span v-else>
              <HoppButtonPrimary
                class="mr-4"
                filled
                outline
                label="Remove Admin Privilege"
                @click="makeAdminToUser(user.uid)"
              />
            </span>
            <HoppButtonSecondary
              v-if="!user.isAdmin"
              class="mr-4 !bg-red-600 !text-gray-300 !hover:text-gray-100"
              filled
              outline
              label="Delete"
              @click="deleteUser(user.uid)"
            />

            <HoppButtonSecondary
              v-if="user.isAdmin"
              class="mr-4 !bg-red-600 !text-gray-300 !hover:text-gray-100"
              filled
              outline
              label="Delete"
              @click="
                toast.error('Remove admin privilege to delete the user!!')
              "
            />
          </div>
        </div>
      </div>
    </div>
    <HoppSmartConfirmModal
      :show="confirmDeletion"
      :title="`Confirm deletion of user?`"
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
import { onMounted, ref } from 'vue';
import { useMutation } from '@urql/vue';
import {
  MakeUserAdminDocument,
  UserInfoDocument,
  RemoveUserAccountByAdminDocument,
  RemoveUserAsAdminDocument,
} from '../../helpers/backend/graphql';
import { useClientHandle } from '@urql/vue';
import { format } from 'date-fns';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from '../../composables/toast';

const toast = useToast();

// Get Proper Date Formats
const getCreatedDateAndTime = (date: string) =>
  format(new Date(date), 'd-MM-yyyy  hh:mm a');

// Get User Info
const user = ref();
const { client } = useClientHandle();
const fetching = ref(true);
const route = useRoute();

onMounted(async () => {
  fetching.value = true;
  const result = await client
    .query(UserInfoDocument, { uid: route.params.id.toString() })
    .toPromise();

  if (result.error) {
    toast.error('Unable to load user info..');
  }
  user.value = result.data?.admin.userInfo ?? {};
  fetching.value = false;
});

// User Deletion
const router = useRouter();
const userDeletion = useMutation(RemoveUserAccountByAdminDocument);
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
    }
  });
  confirmDeletion.value = false;
  deleteUserUID.value = null;
  router.push('/users');
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
    toast.error('User deletion failed!!');
    return;
  }
  const variables = { uid: id };
  await userToAdmin.executeMutation(variables).then((result) => {
    if (result.error) {
      toast.error('Failed to make user an admin!!');
    } else {
      user.value.isAdmin = true;
      toast.success('User is now an admin!!');
    }
  });
  confirmUserToAdmin.value = false;
  userToAdminUID.value = null;
};

// Remove Admin Status from a current admin user
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
      user.value.isAdmin = false;
      toast.success('Admin status removed!!');
    }
  });
  confirmAdminToUser.value = false;
  adminToUserUID.value = null;
};
</script>
