<template>
  <div class="flex">
    <!-- Backdrop -->
    <div
      :class="isOpen ? 'block' : 'hidden'"
      @click="isOpen = false"
      class="fixed inset-0 z-20 transition-opacity bg-primary opacity-50 lg:hidden"
    ></div>
    <!-- End Backdrop -->

    <div
      :class="isOpen ? '' : '-translate-x-full ease-in'"
      class="sidebar-container transform !md:translate-x-0 ease-out"
    >
      <div :class="isExpanded ? 'w-56' : 'w-full'">
        <div class="flex items-center justify-start px-4 my-4">
          <div class="flex items-center">
            <HoppSmartLink class="flex items-center space-x-4" to="/dashboard">
              <img src="/logo.svg" alt="hoppscotch-logo" class="h-7 w-7" />

              <span
                v-if="isExpanded"
                class="font-semibold text-accentContrast"
                >{{ t('app.name') }}</span
              >
            </HoppSmartLink>
          </div>
        </div>
        <nav class="my-5">
          <HoppSmartLink
            v-for="(navigation, index) in primaryNavigations"
            :key="`navigation-${index}`"
            v-tippy="{
              theme: 'tooltip',
              placement: 'right',
              content: !isExpanded ? navigation.label : null,
            }"
            :to="navigation.to"
            tabindex="0"
            :exact="navigation.exact"
            :class="
              !isExpanded
                ? 'flex items-center justify-center'
                : 'flex items-center'
            "
          >
            <div
              class="flex p-5 w-full font-bold"
              :class="
                  currentRouteName.startsWith(navigation.baseRouteName)
                  ? 'bg-primaryDark text-secondaryDark border-l-2 border-l-emerald-600'
                  : 'bg-primary hover:bg-primaryLight hover:text-secondaryDark focus-visible:text-secondaryDark focus-visible:bg-primaryLight focus-visible:outline-none'
              "
            >
              <div
                v-if="navigation.icon"
                class="svg-icons"
                :class="isExpanded ? 'mr-3' : 'mx-auto'"
              >
                <component :is="navigation.icon" />
              </div>
              <span v-if="isExpanded" class="nav-title">
                {{ navigation.label }}
              </span>
            </div>
          </HoppSmartLink>
        </nav>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, type Component } from 'vue';
import { useRoute } from 'vue-router';

import { useI18n } from '~/composables/i18n';
import { useSidebar } from '~/composables/useSidebar';
import IconDashboard from '~icons/lucide/layout-dashboard';
import IconSettings from '~icons/lucide/settings';
import IconUser from '~icons/lucide/user';
import IconUsers from '~icons/lucide/users';

const route = useRoute()
const t = useI18n();

const { isOpen, isExpanded } = useSidebar();

type NavigationItem = {
  label: string;
  icon: Component;
  to: string;
  exact: boolean;
  baseRouteName: string;
};

const primaryNavigations: NavigationItem[] = [
  {
    label: t('metrics.dashboard'),
    icon: IconDashboard,
    to: '/dashboard',
    exact: true,
    baseRouteName: 'dashboard',
  },
  {
    label: t('users.users'),
    icon: IconUser,
    to: '/users',
    exact: false,
    baseRouteName: 'users'
  },
  {
    label: t('teams.teams'),
    icon: IconUsers,
    to: '/teams',
    exact: false,
    baseRouteName: 'teams'
  },
  {
    label: t('settings.settings'),
    icon: IconSettings,
    to: '/settings',
    exact: true,
    baseRouteName: 'settings',
  },
];

const currentRouteName = computed(() => route.name as string);
</script>

<style scoped lang="scss">
.sidebar-container {
  @apply fixed md:static md:translate-x-0 md:inset-0 inset-y-0 left-0 z-30;
  @apply transition duration-300;
  @apply flex overflow-y-auto bg-primary border-r border-divider;
}
</style>
