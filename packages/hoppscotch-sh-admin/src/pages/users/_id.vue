<template>
  <div v-if="fetching" class="flex justify-center"><HoppSmartSpinner /></div>
  <div v-else class="flex flex-col space-y-4">
    <div class="flex gap-x-3">
      <button
        class="p-2 mb-2 rounded-3xl bg-divider"
        @click="router.push('/users')"
      >
        <icon-lucide-arrow-left class="text-xl" />
      </button>

      <div class="flex items-center space-x-3">
        <h1 class="text-lg text-accentContrast">
          {{ user.displayName }}
        </h1>
        <span>/</span>
        <h2 class="text-lg text-accentContrast">
          {{ currentTabName }}
        </h2>
      </div>
    </div>

    <div class="pb-8">
      <HoppSmartTabs v-model="selectedOptionTab" render-inactive-tabs>
        <HoppSmartTab :id="'details'" :label="t('users.details')">
          <UsersDetails
            :user="user"
            @delete-user="deleteUser"
            @make-admin="makeUserAdmin"
            @remove-admin="makeAdminToUser"
            class="py-8 px-4"
          />
        </HoppSmartTab>
        <HoppSmartTab :id="'requests'" :label="t('shared_requests.title')">
          <UsersSharedRequests :email="user.email" class="py-8 px-4 mt-10" />
        </HoppSmartTab>
      </HoppSmartTabs>
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
import { onMounted, ref, computed } from 'vue';
import { useMutation } from '@urql/vue';
import {
  MakeUserAdminDocument,
  UserInfoDocument,
  RemoveUserByAdminDocument,
  RemoveUserAsAdminDocument,
} from '~/helpers/backend/graphql';
import { useClientHandle } from '@urql/vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from '~/composables/toast';
import { useI18n } from '~/composables/i18n';

const t = useI18n();

const toast = useToast();

// Tabs
type OptionTabs = 'details' | 'requests';
const selectedOptionTab = ref<OptionTabs>('details');

const currentTabName = computed(() => {
  switch (selectedOptionTab.value) {
    case 'details':
      return t('users.details');
    case 'requests':
      return t('shared_requests.title');
    default:
      return '';
  }
});

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
  user.value = result.data?.infra.userInfo ?? {};
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
