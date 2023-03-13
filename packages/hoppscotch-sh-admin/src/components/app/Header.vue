<template>
  <header
    class="flex items-center justify-between border-b border-gray-600 px-6 py-4 bg-neutral-900 shadow-lg"
  >
    <div class="flex items-center">
      <button
        @click="isOpen = true"
        class="text-gray-200 focus:outline-none md:hidden mr-2"
      >
        <icon-lucide-menu class="text-gray-300 w-6" />
      </button>

      <div class="mr-3 mt-2 xs:hidden md:block">
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

      <div v-if="currentUser" class="relative">
        <button
          @click="dropdownOpen = !dropdownOpen"
          class="relative z-10 block w-8 h-8 overflow-hidden rounded-full shadow focus:outline-none"
        >
          <ProfilePicture
            v-if="currentUser.photoURL"
            v-tippy="{
              theme: 'tooltip',
            }"
            :url="currentUser.photoURL"
            :alt="currentUser.displayName ?? 'No Name'"
            :title="currentUser.displayName ?? currentUser.email ?? 'No Name'"
          />
          <ProfilePicture
            v-else
            v-tippy="{ theme: 'tooltip' }"
            :title="currentUser.displayName ?? currentUser.email ?? 'No Name'"
            :initial="currentUser.displayName ?? currentUser.email"
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
            class="absolute right-0 z-20 w-48 py-2 mt-2 bg-zinc-800 rounded-md shadow-xl"
          >
            <HoppSmartItem to="/profile" :icon="IconUser" :label="'Profile'" />
            <HoppSmartItem
              to="/settings"
              :icon="IconSettings"
              :label="'Settings'"
            />
            <AppLogout ref="logout" />
          </div>
        </transition>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import IconSettings from '~icons/lucide/settings';
import IconUser from '~icons/lucide/user';
import { ref } from 'vue';
import { useReadonlyStream } from '~/composables/stream';
import { useSidebar } from '~/composables/useSidebar';
import { auth } from '~/helpers/auth';

const { isOpen, isExpanded } = useSidebar();

const currentUser = useReadonlyStream(
  auth.getProbableUserStream(),
  auth.getProbableUser()
);

const expandSidebar = () => {
  isExpanded.value = !isExpanded.value;
};

const dropdownOpen = ref(false);
</script>
