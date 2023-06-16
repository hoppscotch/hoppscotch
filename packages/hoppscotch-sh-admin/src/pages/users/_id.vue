<template>
  <div v-if="fetching" class="flex justify-center"><HoppSmartSpinner /></div>
  <div v-else class="flex flex-col space-y-4">
    <div>
      <button
        class="p-2 mb-2 rounded-3xl bg-divider"
        @click="router.push('/users')"
      >
        <icon-lucide-arrow-left class="text-xl" />
      </button>
    </div>

    <div class="rounded-md">
      <div class="grid gap-6 mt-4">
        <div v-if="user.photoURL" class="relative h-20 w-20">
          <img class="object-cover rounded-3xl mb-3" :src="user.photoURL" />
          <span
            v-if="user.isAdmin"
            class="absolute left-17 bottom-0 text-xs font-medium px-3 py-0.5 rounded-full bg-green-900 text-green-300"
          >
            {{ t('users.admin') }}
          </span>
        </div>

        <div v-else class="bg-primaryDark w-17 p-3 rounded-2xl mb-3 relative">
          <icon-lucide-user class="text-4xl" />
          <span
            v-if="user.isAdmin"
            class="absolute left-15 bottom-0 text-xs font-medium px-3 py-0.5 rounded-full bg-green-900 text-green-300"
          >
            {{ t('users.admin') }}
          </span>
        </div>

        <div v-if="user.uid">
          <label class="text-secondaryDark" for="username">{{
            t('users.uid')
          }}</label>
          <div
            class="w-full p-3 mt-2 bg-zinc-800 border-gray-600 rounded-md focus:border-emerald-600 focus:ring focus:ring-opacity-40 focus:ring-emerald-500"
          >
            {{ user.uid }}
          </div>
        </div>
        <div>
          <label class="text-secondaryDark" for="username">{{
            t('users.name')
          }}</label>
          <div
            class="w-full p-3 mt-2 bg-zinc-800 border-gray-600 rounded-md focus:border-emerald-600 focus:ring focus:ring-opacity-40 focus:ring-emerald-500"
          >
            <span v-if="user.displayName">
              {{ user.displayName }}
            </span>
            <span v-else> {{ t('users.unnamed') }} </span>
          </div>
        </div>
        <div v-if="user.email">
          <label class="text-secondaryDark" for="username">{{
            t('users.email')
          }}</label>
          <div
            class="w-full p-3 mt-2 bg-zinc-800 border-gray-200 border-gray-600 rounded-md focus:border-emerald-600 focus:ring focus:ring-opacity-40 focus:ring-emerald-500"
          >
            {{ user.email }}
          </div>
        </div>
        <div v-if="user.createdOn">
          <label class="text-secondaryDark" for="username">{{
            t('users.created_on')
          }}</label>
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
            :label="t('users.make_admin')"
            @click="makeUserAdmin(user.uid)"
          />
        </span>
        <span v-else>
          <HoppButtonPrimary
            class="mr-4"
            filled
            outline
            :icon="IconUserMinus"
            :label="t('users.remove_admin_privilege')"
            @click="makeAdminToUser(user.uid)"
          />
        </span>
        <HoppButtonSecondary
          v-if="!user.isAdmin"
          class="mr-4 !bg-red-600 !text-gray-300 !hover:text-gray-100"
          filled
          outline
          :label="t('users.delete')"
          :icon="IconTrash"
          @click="deleteUser(user.uid)"
        />

        <HoppButtonSecondary
          v-if="user.isAdmin"
          class="mr-4 !bg-red-600 !text-gray-300 !hover:text-gray-100"
          filled
          outline
          :icon="IconTrash"
          :label="t('users.delete')"
          @click="toast.error(t('state.remove_admin_to_delete_user'))"
        />
      </div>
    </div>
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
import { onMounted, ref } from 'vue';
import { useMutation } from '@urql/vue';
import {
  MakeUserAdminDocument,
  UserInfoDocument,
  RemoveUserByAdminDocument,
  RemoveUserAsAdminDocument,
} from '../../helpers/backend/graphql';
import { useClientHandle } from '@urql/vue';
import { format } from 'date-fns';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from '~/composables/toast';
import IconTrash from '~icons/lucide/trash';
import IconUserMinus from '~icons/lucide/user-minus';
import { useI18n } from '~/composables/i18n';

const t = useI18n();

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
    toast.error(`${t('users.load_info_error')}`);
  }
  user.value = result.data?.admin.userInfo ?? {};
  fetching.value = false;
});

// User Deletion
const router = useRouter();
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
    toast.error(`${t('state.delete_user_failure')}`);
    return;
  }
  const variables = { uid: id };
  await userDeletion.executeMutation(variables).then((result) => {
    if (result.error) {
      toast.error(`${t('state.delete_user_failure')}`);
    } else {
      toast.success(`${t('state.delete_user_success')}`);
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
    toast.error(`${t('state.admin_failure')}`);
    return;
  }
  const variables = { uid: id };
  await userToAdmin.executeMutation(variables).then((result) => {
    if (result.error) {
      toast.error(`${t('state.admin_failure')}`);
    } else {
      user.value.isAdmin = true;
      toast.success(`${t('state.admin_success')}`);
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
    toast.error(`${t('state.remove_admin_failure')}`);
    return;
  }
  const variables = { uid: id };
  await adminToUser.executeMutation(variables).then((result) => {
    if (result.error) {
      toast.error(`${t('state.remove_admin_failure')}`);
    } else {
      user.value.isAdmin = false;
      toast.error(`${t('state.remove_admin_success')}`);
    }
  });
  confirmAdminToUser.value = false;
  adminToUserUID.value = null;
};
</script>
