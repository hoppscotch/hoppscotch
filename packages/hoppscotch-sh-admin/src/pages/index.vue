<template>
  <div
    class="flex items-center justify-center h-screen px-6 bg-gray-200 dark:bg-gradient-to-r dark:from-zinc-700 dark:to-gray-900"
  >
    <div
      class="w-full max-w-lg p-8 bg-white dark:bg-gradient-to-r dark:from-zinc-800 dark:to-gray-900 rounded-lg shadow-md"
    >
      <div class="flex items-center justify-center mt-6">
        <div class="flex items-center">
          <img src="/public/cover.jpg" alt="" class="h-12" />

          <span
            class="mx-2 text-2xl font-semibold text-gray-600 dark:text-gray-300"
            >Hoppscotch</span
          >
        </div>
      </div>

      <form class="mt-4" @submit.prevent="login">
        <label class="block">
          <span class="text-sm text-gray-400">Email</span>
          <input
            type="email"
            class="block w-full p-2 mt-1 bg-gray-700 border-gray-700 rounded-md focus:border-emerald-600 focus:ring focus:ring-opacity-40 focus:ring-emerald-500"
            v-model="email"
          />
        </label>

        <label class="block mt-3">
          <span class="text-sm text-gray-400">Password</span>
          <input
            type="password"
            class="block w-full p-2 mt-1 bg-gray-700 border-gray-700 rounded-md focus:border-emerald-600 focus:ring focus:ring-opacity-40 focus:ring-emerald-500"
            v-model="password"
          />
        </label>

        <div class="flex items-center justify-between mt-4">
          <div>
            <label class="inline-flex items-center">
              <input
                type="checkbox"
                class="text-indigo-600 border-gray-200 rounded-md focus:border-emerald-600 focus:ring focus:ring-opacity-40 focus:ring-emerald-500"
              />
              <span class="mx-2 text-sm text-gray-400">Remember me</span>
            </label>
          </div>

          <div>
            <a
              class="block text-sm text-emerald-700 fontme hover:underline"
              href="#"
              >Forgot your password?</a
            >
          </div>
        </div>

        <div class="mt-6">
          <button
            type="submit"
            class="w-full px-4 py-2 text-sm text-center text-white bg-emerald-600 rounded-md focus:outline-none hover:bg-emerald-500"
          >
            Sign in
          </button>
        </div>

        <div class="mt-6">
          <button
            type="submit"
            class="w-full px-4 py-2 text-sm text-center text-white border border-gray-500 rounded-md focus:outline-none hover:bg-gray-700"
          >
            Sign in with Google
          </button>
        </div>

        <div class="mt-6">
          <button
            type="submit"
            class="w-full px-4 py-2 text-sm text-center text-white border border-gray-500 rounded-md focus:outline-none hover:bg-gray-700"
          >
            Sign in with Microsoft
          </button>
        </div>

        <div class="mt-6">
          <button
            type="submit"
            class="w-full px-4 py-2 text-sm text-center text-white border border-gray-500 rounded-md focus:outline-none hover:bg-gray-700"
          >
            Sign in with Github
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const email = ref('joel@gmail.com');
const password = ref('@#!@#asdf1231!_!@#');

function login() {
  router.push('/dashboard');
}
</script>

<route lang="yaml">
meta:
  layout: empty
</route>
