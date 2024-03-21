<template>
  <div class="rounded-md">
    <div class="grid gap-6 mt-4">
      <div
        class="relative"
        :class="
          user.photoURL
            ? 'h-20 w-20'
            : 'bg-primaryDark w-16 p-3 rounded-2xl mb-3'
        "
      >
        <img
          v-if="user.photoURL"
          class="object-cover rounded-3xl mb-3"
          :src="user.photoURL"
        />
        <icon-lucide-user v-else class="text-4xl" />
        <span
          v-if="user.isAdmin"
          class="absolute left-16 bottom-0 text-xs font-medium px-3 py-0.5 rounded-full bg-green-900 text-green-300"
        >
          {{ t('users.admin') }}
        </span>
      </div>

      <template v-for="(info, key) in userInfo" :key="key">
        <div v-if="info.condition">
          <label class="text-secondaryDark" :for="key">{{ info.label }}</label>
          <div
            class="w-full p-3 mt-2 bg-divider border-gray-600 rounded-md focus:border-emerald-600 focus:ring focus:ring-opacity-40 focus:ring-emerald-500"
          >
            <span>{{ info.value }}</span>
          </div>
        </div>
      </template>
    </div>

    <div class="flex justify-start mt-8">
      <HoppButtonPrimary
        :icon="user.isAdmin ? IconUserMinus : IconUserCheck"
        :label="
          user.isAdmin
            ? t('users.remove_admin_privilege')
            : t('users.make_admin')
        "
        filled
        outline
        class="mr-4"
        @click="
          user.isAdmin
            ? emit('remove-admin', user.uid)
            : emit('make-admin', user.uid)
        "
      />

      <HoppButtonSecondary
        :icon="IconTrash"
        :label="t('users.delete')"
        filled
        outline
        class="mr-4 bg-red-600 text-white hover:text-gray-100"
        @click="
          user.isAdmin
            ? toast.error(t('state.remove_admin_to_delete_user'))
            : emit('delete-user', user.uid)
        "
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { format } from 'date-fns';

import { useI18n } from '~/composables/i18n';
import { useToast } from '~/composables/toast';

import IconTrash from '~icons/lucide/trash';
import IconUserCheck from '~icons/lucide/user-check';
import IconUserMinus from '~icons/lucide/user-minus';

import { UserInfoQuery } from '~/helpers/backend/graphql';

const t = useI18n();

const toast = useToast();

const props = defineProps<{
  user: UserInfoQuery['infra']['userInfo'];
}>();

const emit = defineEmits<{
  (event: 'delete-user', userID: string): void;
  (event: 'make-admin', userID: string): void;
  (event: 'remove-admin', userID: string): void;
}>();

// Get Proper Date Formats
const getCreatedDateAndTime = (date: string) =>
  format(new Date(date), 'd-MM-yyyy  hh:mm a');

// User Info
const { uid, displayName, email, createdOn } = props.user;

const userInfo = {
  uid: {
    condition: uid,
    label: t('users.uid'),
    value: uid,
  },
  displayName: {
    condition: true,
    label: t('users.name'),
    value: displayName ?? t('users.unnamed'),
  },
  email: {
    condition: email,
    label: t('users.email'),
    value: email,
  },
  createdOn: {
    condition: createdOn,
    label: t('users.created_on'),
    value: getCreatedDateAndTime(createdOn),
  },
};
</script>
