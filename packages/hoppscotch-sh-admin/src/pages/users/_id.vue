<template>
  <div v-if="fetching" class="flex justify-center"><HoppSmartSpinner /></div>
  <div v-else>
    <h3 class="sm:px-6 p-4 text-3xl font-medium text-gray-200">User Details</h3>

    <div>
      <div>
        <div class="px-6 rounded-md">
          <div class="grid gap-6 mt-4">
            <div v-if="user.photoURL">
              <img
                class="object-cover h-20 w-20 rounded-3xl mb-3"
                :src="user.photoURL"
              />
            </div>
            <div v-else class="bg-primaryDark w-17 p-3 rounded-2xl mb-3">
              <icon-lucide-user class="text-4xl" />
            </div>
            <div v-if="user.uid">
              <label class="text-gray-200" for="username">UID</label>
              <div
                class="w-full p-3 mt-2 bg-zinc-800 border-gray-600 rounded-md focus:border-emerald-600 focus:ring focus:ring-opacity-40 focus:ring-emerald-500"
              >
                {{ user.uid }}
              </div>
            </div>
            <div v-if="user.displayName">
              <label class="text-gray-200" for="username">Name</label>
              <div
                class="w-full p-3 mt-2 bg-zinc-800 border-gray-600 rounded-md focus:border-emerald-600 focus:ring focus:ring-opacity-40 focus:ring-emerald-500"
              >
                {{ user.displayName }}
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
            <HoppButtonSecondary
              class="mr-4"
              filled
              outline
              label="Delete"
              @click="deleteUser(user.uid)"
            />
          </div>
        </div>
      </div>
    </div>
    <HoppSmartConfirmModal
      :show="confirmDeletion"
      :title="`Confirm Deletion of User?`"
      @hide-modal="confirmDeletion = false"
      @resolve="deleteUserMutation(deleteUserUID)"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useMutation } from '@urql/vue';
import {
  UserInfoDocument,
  RemoveUserAccountByAdminDocument,
} from '../../helpers/backend/graphql';
import { useClientHandle } from '@urql/vue';
import { format } from 'date-fns';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from '../../composables/toast';
import { HoppButtonSecondary, HoppSmartSpinner } from '@hoppscotch/ui';

// Get Proper Date Formats
const getCreatedDateAndTime = (date: string) =>
  format(new Date(date), 'd-MM-yyyy  hh:mm a');

const route = useRoute();
const toast = useToast();

// Get User Info
const user = ref();
const { client } = useClientHandle();
const fetching = ref(true);

onMounted(async () => {
  fetching.value = true;
  const result = await client
    .query(UserInfoDocument, { uid: route.params.id.toString() })
    .toPromise();

  if (result.error) {
    toast.error('Unable to Load User Info..');
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
    toast.error('User Deletion Failed');
    return;
  }
  const variables = { uid: id };
  await userDeletion.executeMutation(variables).then((result) => {
    if (result.error) {
      toast.error('User Deletion Failed');
    } else {
      toast.success('User Deleted Successfully');
    }
  });
  confirmDeletion.value = false;
  deleteUserUID.value = null;
  router.push('/users');
};
</script>
