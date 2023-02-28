<template>
  <header
    class="flex items-center justify-between border-b border-gray-400 dark:border-gray-600 px-6 py-4 bg-neutral-50 dark:bg-neutral-900 shadow-lg"
  >
    <div class="flex items-center">
      <button
        @click="isOpen = true"
        class="text-gray-200 focus:outline-none lg:hidden mr-2"
      >
        <icon-lucide-menu class="text-gray-300 w-6" />
      </button>

      <div class="mr-3 mt-2">
        <button @click="expandSidebar">
          <icon-lucide-sidebar-open
            v-if="isExpanded"
            class="text-gray-300 w-6"
          />
          <icon-lucide-sidebar-close v-else class="text-gray-300 w-6" />
        </button>
      </div>
    </div>

    <div class="flex items-center">
      <button class="flex mx-4 text-gray-400 focus:outline-none toggle-dark">
        <icon-lucide-bell class="text-gray-300 w-6" />
      </button>

      <div class="relative">
        <button
          @click="dropdownOpen = !dropdownOpen"
          class="relative z-10 block w-8 h-8 overflow-hidden rounded-full shadow focus:outline-none"
        >
          <img
            class="object-cover w-full h-full"
            src="https://media.licdn.com/dms/image/C5603AQHMCx72bNN1MA/profile-displayphoto-shrink_800_800/0/1630736416611?e=2147483647&v=beta&t=McWCdK_7t_NLeU4ze3JPB8xvwg5w50Okuj2JDBekqjw"
            alt="Your avatar"
          />
        </button>

        <div
          v-show="dropdownOpen"
          @click="dropdownOpen = false"
          class="fixed inset-0 z-10 w-full h-full"
        ></div>

        <transition
          enter-active-class="transition duration-150 ease-out transform"
          enter-from-class="scale-95 opacity-0"
          enter-to-class="scale-100 opacity-100"
          leave-active-class="transition duration-150 ease-in transform"
          leave-from-class="scale-100 opacity-100"
          leave-to-class="scale-95 opacity-0"
        >
          <div
            v-show="dropdownOpen"
            class="absolute right-0 z-20 w-48 py-2 mt-2 bg-zinc-200 dark:bg-zinc-800 rounded-md shadow-xl"
          >
            <a
              href="#"
              class="block px-4 py-2 text-sm text-gray-800 dark:text-gray-200 hover:bg-emerald-700 hover:text-white"
              >Profile</a
            >
            <a
              href="#"
              class="block px-4 py-2 text-sm text-gray-800 dark:text-gray-200 hover:bg-emerald-700 hover:text-white"
              >Settings</a
            >
            <router-link
              to="/"
              class="block px-4 py-2 text-sm text-gray-800 dark:text-gray-200 hover:bg-emerald-700 hover:text-white"
              >Log out</router-link
            >
          </div>
        </transition>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useSidebar } from '../../composables/useSidebar';

const { isOpen, isExpanded } = useSidebar();

const expandSidebar = () => {
  isExpanded.value = !isExpanded.value;
};

const dropdownOpen = ref(false);
</script>
