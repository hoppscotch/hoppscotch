<template>
  <div>
    <div>
      <div class="px-6 rounded-md">
        <div class="grid gap-6 mt-4">
          <div v-if="user.photoURL" class="h-10">
            <img :src="user?.photoURL" alt="" />
          </div>
          <div>
            <label class="text-gray-800 dark:text-gray-200" for="username"
              >UID</label
            >
            <div
              v-if="user.uid"
              class="w-full p-3 mt-2 dark:bg-zinc-800 border-gray-200 dark:border-gray-600 rounded-md focus:border-emerald-600 focus:ring focus:ring-opacity-40 focus:ring-emerald-500"
            >
              {{ user?.uid }}
            </div>
          </div>
          <div v-if="user.displayName">
            <label class="text-gray-800 dark:text-gray-200" for="username"
              >Name</label
            >
            <div
              class="w-full p-3 mt-2 dark:bg-zinc-800 border-gray-200 dark:border-gray-600 rounded-md focus:border-emerald-600 focus:ring focus:ring-opacity-40 focus:ring-emerald-500"
            >
              {{ user?.displayName }}
            </div>
          </div>
          <div v-if="user.email">
            <label class="text-gray-800 dark:text-gray-200" for="username"
              >Email</label
            >
            <div
              class="w-full p-3 mt-2 dark:bg-zinc-800 border-gray-200 dark:border-gray-600 rounded-md focus:border-emerald-600 focus:ring focus:ring-opacity-40 focus:ring-emerald-500"
            >
              {{ user?.email }}
            </div>
          </div>
          <div v-if="user.createdOn">
            <label class="text-gray-800 dark:text-gray-200" for="username"
              >Created On</label
            >
            <div
              class="w-full p-3 mt-2 dark:bg-zinc-800 border-gray-200 dark:border-gray-600 rounded-md focus:border-emerald-600 focus:ring focus:ring-opacity-40 focus:ring-emerald-500"
            >
              {{ getCreatedDateAndTime(user?.createdOn) }}
            </div>
          </div>
        </div>

        <div class="flex justify-center sm:justify-start mt-8">
          <button
            class="mr-3 px-4 py-2 text-gray-200 bg-emerald-900 rounded-md hover:bg-emerald-700 focus:outline-none focus:bg-emerald-800"
          >
            Go Back
          </button>

          <button
            @click="deleteUser"
            class="px-4 py-2 text-gray-200 bg-red-800 rounded-md hover:bg-red-600 focus:outline-none focus:bg-red-800"
          >
            Delete User
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineProps, onMounted, ref } from 'vue';
import { format } from 'date-fns';
import { useQuery } from '@urql/vue';
import { UserInfoDocument } from '../../helpers/backend/graphql';
import { routeLocationKey, useRoute } from 'vue-router';

const route = useRoute();

const { fetching, error, data } = useQuery({ query: UserInfoDocument });

// Get Proper Date Formats
const getCreatedDateAndTime = (date: string) =>
  format(new Date(date), 'd-MM-yyyy  hh:mm a');

const props = defineProps({
  user: {
    type: Object,
    required: true,
  },
});

onMounted(() => {
  console.log('mounted');

  console.log(props.user.uid);
});

const deleteUser = () => {
  console.log('delete user');
};
</script>

<style>
.modal {
  transition: opacity 0.25s ease;
}
</style>
