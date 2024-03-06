<template>
  <div v-if="fetching" class="flex justify-center"><HoppSmartSpinner /></div>
  <div v-else-if="error" class="text-lg">{{ t('users.load_info_error') }}</div>
  <div v-else-if="user" class="flex flex-col space-y-4">
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
          <UsersSharedRequests :email="user.email" />
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
import { useMutation } from '@urql/vue';
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from '~/composables/i18n';
import { useToast } from '~/composables/toast';
import { useClientHandler } from '~/composables/useClientHandler';
import {
  MakeUserAdminDocument,
  RemoveUserAsAdminDocument,
  RemoveUserByAdminDocument,
  UserInfoDocument,
} from '~/helpers/backend/graphql';

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

const route = useRoute();

const { fetching, error, data, fetchData } = useClientHandler(
  UserInfoDocument,
  {
    uid: route.params.id.toString(),
  }
);

onMounted(async () => {
  await fetchData();
});

const user = computed({
  get: () => data.value?.infra.userInfo,
  set: (value) => {
    if (value) {
      data.value!.infra.userInfo = value;
    }
  },
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
    toast.error(t('state.delete_user_failure'));
    return;
  }
  const variables = { uid: id };
  const result = await userDeletion.executeMutation(variables);

  if (result.error) {
    toast.error(t('state.delete_user_failure'));
  } else {
    toast.success(t('state.delete_user_success'));
  }

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
    toast.error(t('state.admin_failure'));
    return;
  }
  const variables = { uid: id };
  const result = await userToAdmin.executeMutation(variables);
  if (result.error) {
    toast.error(t('state.admin_failure'));
  } else {
    user.value!.isAdmin = true;
    toast.success(t('state.admin_success'));
  }
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
    toast.error(t('state.remove_admin_failure'));
    return;
  }
  const variables = { uid: id };
  const result = await adminToUser.executeMutation(variables);
  if (result.error) {
    toast.error(t('state.remove_admin_failure'));
  } else {
    user.value!.isAdmin = false;
    toast.error(t('state.remove_admin_success'));
  }
  confirmAdminToUser.value = false;
  adminToUserUID.value = null;
};
</script>
