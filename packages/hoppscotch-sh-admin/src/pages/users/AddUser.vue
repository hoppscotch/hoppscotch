<template>
  <h3 class="sm:px-6 p-4 text-3xl font-medium text-zinc-800 dark:text-gray-200">
    Add User
  </h3>

  <div>
    <div>
      <div class="px-6 rounded-md">
        <form @submit.prevent="register">
          <div class="grid gap-6 mt-4">
            <div>
              <label class="text-gray-800 dark:text-gray-200" for="username"
                >Name</label
              >
              <input
                class="w-full mt-2 dark:bg-zinc-800 border-gray-200 dark:border-gray-600 rounded-md focus:border-emerald-600 focus:ring focus:ring-opacity-40 focus:ring-emerald-500"
                type="text"
                placeholder="Enter Name"
                v-model="user.name"
              />
            </div>
            <div>
              <label class="text-gray-800 dark:text-gray-200" for="username"
                >Username</label
              >
              <input
                class="w-full mt-2 dark:bg-zinc-800 border-gray-200 dark:border-gray-600 rounded-md focus:border-emerald-600 focus:ring focus:ring-opacity-40 focus:ring-emerald-500"
                type="text"
                placeholder="Enter Username"
                v-model="user.username"
              />
            </div>

            <div>
              <label class="text-gray-800 dark:text-gray-200" for="emailAddress"
                >Email Address</label
              >
              <input
                class="w-full mt-2 dark:bg-zinc-800 border-gray-200 dark:border-gray-600 rounded-md focus:border-emerald-600 focus:ring focus:ring-opacity-40 focus:ring-emerald-500"
                type="email"
                placeholder="Enter Email Address"
                v-model="user.email"
              />
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2">
              <div class="sm:mt-0 sm:mr-3">
                <label class="text-gray-800 dark:text-gray-200" for="password"
                  >Password</label
                >
                <input
                  class="w-full mt-2 dark:bg-zinc-800 border-gray-200 dark:border-gray-600 rounded-md focus:border-emerald-600 focus:ring focus:ring-opacity-40 focus:ring-emerald-500"
                  type="password"
                  placeholder="Enter Password"
                  v-model="user.password"
                />
              </div>

              <div class="mt-6 ml-0 sm:mt-0 sm:ml-3">
                <label
                  class="text-gray-800 dark:text-gray-200"
                  for="passwordConfirmation"
                  >Password Confirmation</label
                >
                <input
                  class="w-full mt-2 dark:bg-zinc-800 border-gray-200 dark:border-gray-600 rounded-md focus:border-emerald-600 focus:ring focus:ring-opacity-40 focus:ring-emerald-500"
                  type="password"
                  placeholder="Password Confirmation"
                  v-model="user.confirm"
                />
              </div>
            </div>
          </div>

          <div class="flex justify-center sm:justify-start mt-8">
            <router-link to="/user">
              <button
                class="px-4 py-2 text-gray-200 bg-emerald-900 rounded-md hover:bg-emerald-700 focus:outline-none focus:bg-emerald-800"
              >
                Save
              </button>
            </router-link>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineProps, ref } from 'vue';

const props = defineProps({
  open: {
    type: Boolean,
  },
});

interface User {
  name: string;
  username: string;
  email: string;
  password: string;
  confirm: string;
}

const user = ref<User>({
  name: '',
  username: '',
  email: '',
  password: '',
  confirm: '',
});

const register = () => {
  const data = JSON.parse(JSON.stringify(user.value));
  console.log('Registered: ', data);
};
</script>

<style>
.modal {
  transition: opacity 0.25s ease;
}
</style>
