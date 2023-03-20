<template>
  <div class="flex">
    <!-- Backdrop -->
    <div
      :class="isOpen ? 'block' : 'hidden'"
      @click="isOpen = false"
      class="fixed inset-0 z-20 transition-opacity bg-black opacity-50 lg:hidden"
    ></div>
    <!-- End Backdrop -->

    <div
      :class="isOpen ? '' : '!-translate-x-full ease-in'"
      class="sidebar-container transform !md:translate-x-0 ease-out"
    >
      <div :class="isExpanded ? 'w-64' : 'w-full'">
        <div class="flex items-center justify-start mt-6 ml-6">
          <div class="flex items-center">
            <router-link class="flex" to="/dashboard">
              <img src="/public/cover.jpg" alt="" class="h-7" />

              <span
                v-if="isExpanded"
                class="mx-2 text-xl font-semibold text-gray-200"
                >Hoppscotch</span
              >
            </router-link>
          </div>
        </div>

        <nav class="mt-10">
          <router-link
            class="flex items-center px-6 py-4 duration-200 border-l-4"
            :class="[route.name === '/dashboard' ? activeClass : inactiveClass]"
            to="/dashboard"
          >
            <icon-lucide-layout-dashboard
              class="text-xl"
              :class="route.name === '/dashboard' ? 'white' : 'gray'"
            />

            <span v-if="isExpanded" class="mx-4 font-semibold">Dashboard</span>
          </router-link>

          <router-link
            class="flex items-center px-6 py-4 duration-200 border-l-4 rounded-sm"
            :class="[route.name === 'User' ? activeClass : inactiveClass]"
            to="/users"
          >
            <icon-lucide-user
              class="text-xl"
              :class="route.path === '/users' ? 'white' : 'gray'"
            />

            <span v-if="isExpanded" class="mx-4 font-semibold">Users</span>
          </router-link>

          <router-link
            class="flex items-center px-6 py-4 duration-200 border-l-4 rounded-sm"
            :class="[route.name === '/teams' ? activeClass : inactiveClass]"
            to="/teams"
          >
            <icon-lucide-users
              class="text-xl"
              :class="route.name === '/teams' ? 'white' : 'gray'"
            />

            <span v-if="isExpanded" class="mx-4 font-semibold">Teams</span>
          </router-link>
        </nav>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useSidebar } from '../../composables/useSidebar';
import { useRoute } from 'vue-router';

const { isOpen, isExpanded } = useSidebar();

const route = useRoute();

const activeClass =
  'bg-gray-600 bg-opacity-25 text-gray-100 border-gray-100 border-emerald-600';
const inactiveClass =
  'border-gray-900 text-gray-500 hover:bg-gray-600 hover:bg-opacity-25 hover:text-gray-100';
</script>

<style scoped>
.sidebar-container {
  @apply fixed md:static md:translate-x-0 md:inset-0 inset-y-0 left-0 z-30;
  @apply transition duration-300;

  @apply flex overflow-y-auto bg-neutral-900 border-r border-gray-600;
}
</style>
