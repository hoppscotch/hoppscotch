<template>
  <div class="sm:px-6 p-4">
    <h3
      class="sm:px-6 p-4 text-3xl font-medium text-gray-800 dark:text-gray-200"
    >
      User Detail
    </h3>

    <div class="mt-5">
      <div class="flex flex-wrap justify-center mx-6">
        <div class="w-full px-4 sm:w-1/2 xl:w-1/3">
          <div
            class="h-80 px-6 py-6 bg-zinc-200 dark:bg-zinc-800 rounded-md shadow-sm"
          >
            <div class="flex ml-3 mt-2">
              <icon-lucide-user class="text-emerald-400 text-3xl" />

              <h4
                class="text-3xl ml-2 font-semibold text-gray-700 dark:text-gray-200"
              >
                User Info
              </h4>
            </div>

            <div class="flex mt-5 ml-5 text-xl">
              <h4 class="font-semibold text-gray-700 dark:text-gray-400">
                Name:
              </h4>
              <div class="text-gray-600 dark:text-gray-200 ml-2">
                {{ user.name }}
              </div>
            </div>

            <div class="flex mt-2 ml-5 text-xl">
              <h4 class="font-semibold text-gray-700 dark:text-gray-400">
                Username:
              </h4>
              <div class="text-gray-600 dark:text-gray-200 ml-2">
                {{ user.username }}
              </div>
            </div>

            <div class="flex mt-2 ml-5 text-xl">
              <h4 class="font-semibold text-gray-700 dark:text-gray-400">
                Email:
              </h4>
              <div class="text-gray-600 dark:text-gray-200 ml-2">
                {{ user.email }}
              </div>
            </div>

            <div class="flex mt-2 ml-5 text-xl">
              <h4 class="font-semibold text-gray-700 dark:text-gray-400">
                Password:
              </h4>
              <div class="text-gray-600 dark:text-gray-200 ml-2">
                {{ user.password }}
              </div>
            </div>
          </div>
        </div>

        <div class="w-full px-6 sm:w-1/2 xl:w-1/3">
          <div
            class="h-80 px-5 py-5 bg-zinc-200 dark:bg-zinc-800 rounded-md shadow-sm"
          >
            <div class="flex ml-5 mt-2">
              <icon-lucide-line-chart class="text-yellow-300 text-3xl" />

              <h4
                class="text-3xl ml-2 font-semibold text-gray-700 dark:text-gray-200"
              >
                Stats
              </h4>
            </div>

            <div class="flex mt-5 ml-5 text-xl">
              <h4 class="font-semibold text-gray-700 dark:text-gray-400">
                Role:
              </h4>
              <div class="text-gray-600 dark:text-gray-200 ml-2">
                {{ user.role }}
              </div>
            </div>

            <div class="flex mt-2 ml-5 text-xl">
              <h4 class="font-semibold text-gray-700 dark:text-gray-400">
                Number of Teams:
              </h4>
              <div class="text-gray-600 dark:text-gray-200 ml-2">10</div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="mt-8"></div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

interface User {
  name: string;
  username: string;
  email: string;
  password: string;
  confirm: string;
  role: string;
}

const user = ref<User>({
  name: 'Joel',
  username: 'joeljs',
  email: 'joel@gmail.com',
  password: 'joel@2436',
  confirm: 'yes',
  role: 'Owner',
});
</script>

<style>
.modal {
  transition: opacity 0.25s ease;
}
</style>
