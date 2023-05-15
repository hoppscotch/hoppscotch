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
      :class="isOpen ? '' : '!-translate-x-full ease-in'"
      class="sidebar-container transform !md:translate-x-0 ease-out"
    >
      <div :class="isExpanded ? 'w-xs' : 'w-full'">
        <div class="flex items-center justify-start px-4 my-4">
          <div class="flex items-center">
            <HoppSmartLink class="flex items-center space-x-4" to="/dashboard">
              <img src="/cover.jpg" alt="hoppscotch-logo" class="h-7" />

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
            class="nav-link"
            :class="
              !isExpanded
                ? 'flex items-center justify-center'
                : 'flex items-center'
            "
          >
            <div v-if="navigation.icon">
              <component :is="navigation.icon" class="svg-icons" />
            </div>
            <span v-if="isExpanded" class="nav-title">
              {{ navigation.label }}
            </span>
          </HoppSmartLink>
        </nav>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { HoppSmartLink } from '@hoppscotch/ui';
import { useSidebar } from '~/composables/useSidebar';
import IconDashboard from '~icons/lucide/layout-dashboard';
import IconUser from '~icons/lucide/user';
import IconUsers from '~icons/lucide/users';
import { useI18n } from '~/composables/i18n';

const t = useI18n();

const { isOpen, isExpanded } = useSidebar();

const primaryNavigations = [
  {
    label: t('metrics.dashboard'),
    icon: IconDashboard,
    to: '/dashboard',
    exact: true,
  },
  {
    label: t('users.users'),
    icon: IconUser,
    to: '/users',
    exact: false,
  },
  {
    label: t('teams.teams'),
    icon: IconUsers,
    to: '/teams',
    exact: false,
  },
];
</script>

<style scoped lang="scss">
.sidebar-container {
  @apply fixed md:static md:translate-x-0 md:inset-0 inset-y-0 left-0 z-30;
  @apply transition duration-300;
  @apply flex overflow-y-auto bg-primary border-r border-divider;
}

.nav-link {
  @apply relative;
  @apply p-4;
  @apply flex flex-1;
  @apply items-center;
  @apply space-x-4;
  @apply hover: (bg-primaryDark text-secondaryDark);
  @apply focus-visible: text-secondaryDark;
  @apply after:absolute;
  @apply after:inset-x-0;
  @apply after:md: inset-x-auto;
  @apply after:md: inset-y-0;
  @apply after:bottom-0;
  @apply after:md: bottom-auto;
  @apply after:md: left-0;
  @apply after:z-2;
  @apply after:h-0.5;
  @apply after:md: h-full;
  @apply after:w-full;
  @apply after:md: w-0.5;
  @apply after:content-DEFAULT;
  @apply focus: after: bg-divider;

  .svg-icons {
    @apply opacity-75;
  }

  &.router-link-active {
    @apply text-secondaryDark;
    @apply bg-primaryLight;
    @apply hover: text-secondaryDark;
    @apply after:bg-accent;

    .svg-icons {
      @apply opacity-100;
    }
  }

  &.exact-active-link {
    @apply text-secondaryDark;
    @apply bg-primaryLight;
    @apply hover: text-secondaryDark;
    @apply after:bg-accent;

    .svg-icons {
      @apply opacity-100;
    }
  }
}
</style>
