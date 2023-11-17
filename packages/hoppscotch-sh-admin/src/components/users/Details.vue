<template>
  <div class="rounded-md">
    <div class="grid gap-6 mt-4">
      <div v-if="user.photoURL" class="relative h-20 w-20">
        <img class="object-cover rounded-3xl mb-3" :src="user.photoURL" />
        <span
          v-if="user.isAdmin"
          class="absolute left-16 bottom-0 text-xs font-medium px-3 py-0.5 rounded-full bg-green-900 text-green-300"
        >
          {{ t('users.admin') }}
        </span>
      </div>

      <div v-else class="bg-primaryDark w-16 p-3 rounded-2xl mb-3 relative">
        <icon-lucide-user class="text-4xl" />
        <span
          v-if="user.isAdmin"
          class="absolute left-16 bottom-0 text-xs font-medium px-3 py-0.5 rounded-full bg-green-900 text-green-300"
        >
          {{ t('users.admin') }}
        </span>
      </div>

      <div v-if="user.uid">
        <label class="text-secondaryDark" for="username">{{
          t('users.uid')
        }}</label>
        <div
          class="w-full p-3 mt-2 bg-divider border-gray-600 rounded-md focus:border-emerald-600 focus:ring focus:ring-opacity-40 focus:ring-emerald-500"
        >
          {{ user.uid }}
        </div>
      </div>
      <div>
        <label class="text-secondaryDark" for="username">{{
          t('users.name')
        }}</label>
        <div
          class="w-full p-3 mt-2 bg-divider border-gray-600 rounded-md focus:border-emerald-600 focus:ring focus:ring-opacity-40 focus:ring-emerald-500"
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
          class="w-full p-3 mt-2 bg-divider border-gray-600 rounded-md focus:border-emerald-600 focus:ring focus:ring-opacity-40 focus:ring-emerald-500"
        >
          {{ user.email }}
        </div>
      </div>
      <div v-if="user.createdOn">
        <label class="text-secondaryDark" for="username">{{
          t('users.created_on')
        }}</label>
        <div
          class="w-full p-3 mt-2 bg-divider border-gray-600 rounded-md focus:border-emerald-600 focus:ring focus:ring-opacity-40 focus:ring-emerald-500"
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
          @click="emit('make-admin', user.uid)"
        />
      </span>
      <span v-else>
        <HoppButtonPrimary
          class="mr-4"
          filled
          outline
          :icon="IconUserMinus"
          :label="t('users.remove_admin_privilege')"
          @click="emit('remove-admin', user.uid)"
        />
      </span>
      <HoppButtonSecondary
        v-if="!user.isAdmin"
        class="mr-4 bg-red-600 text-white hover:text-gray-100"
        filled
        outline
        :label="t('users.delete')"
        :icon="IconTrash"
        @click="emit('delete-user', user.uid)"
      />

      <HoppButtonSecondary
        v-if="user.isAdmin"
        class="mr-4 bg-red-600 text-white hover:text-gray-100"
        filled
        outline
        :icon="IconTrash"
        :label="t('users.delete')"
        @click="toast.error(t('state.remove_admin_to_delete_user'))"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { UserInfoQuery } from '../../helpers/backend/graphql';
import { format } from 'date-fns';
import { useToast } from '~/composables/toast';
import IconTrash from '~icons/lucide/trash';
import IconUserMinus from '~icons/lucide/user-minus';
import { useI18n } from '~/composables/i18n';

const t = useI18n();

const toast = useToast();

// Get Proper Date Formats
const getCreatedDateAndTime = (date: string) =>
  format(new Date(date), 'd-MM-yyyy  hh:mm a');

defineProps<{
  user: UserInfoQuery['infra']['userInfo'];
}>();

const emit = defineEmits<{
  (event: 'delete-user', userID: string): void;
  (event: 'make-admin', userID: string): void;
  (event: 'remove-admin', userID: string): void;
}>();
</script>
