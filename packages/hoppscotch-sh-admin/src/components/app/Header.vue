<template>
  <header
    class="flex items-center justify-between border-b border-divider px-6 py-4 bg-primary shadow-lg"
  >
    <div class="flex items-center">
      <HoppButtonSecondary
        v-tippy="{ theme: 'tooltip' }"
        title="Open navigation"
        :icon="IconMenu"
        class="transform !md:hidden mr-2"
        @click="isOpen = true"
      />
      <HoppButtonSecondary
        v-tippy="{ theme: 'tooltip' }"
        :title="isExpanded ? 'Collapse sidebar' : 'Expand sidebar'"
        :icon="isExpanded ? IconSidebarClose : IconSidebarOpen"
        class="transform"
        @click="expandSidebar"
      />
    </div>

    <div class="flex items-center">
      <div v-if="currentUser" class="relative">
        <tippy
          interactive
          trigger="click"
          theme="popover"
          arrow
          :on-shown="() => tippyActions!.focus()"
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
          <template #content="{ hide }">
            <div
              ref="tippyActions"
              class="flex flex-col focus:outline-none"
              tabindex="0"
              @keyup.escape="hide()"
            >
              <div>
                <AppLogout ref="logout" @click="hide()" />
              </div>
            </div>
          </template>
        </tippy>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { TippyComponent } from 'vue-tippy';
import { useReadonlyStream } from '~/composables/stream';
import { useSidebar } from '~/composables/useSidebar';
import { auth } from '~/helpers/auth';
import IconMenu from '~icons/lucide/menu';
import IconSidebarOpen from '~icons/lucide/sidebar-open';
import IconSidebarClose from '~icons/lucide/sidebar-close';

const { isOpen, isExpanded } = useSidebar();

const currentUser = useReadonlyStream(
  auth.getProbableUserStream(),
  auth.getProbableUser()
);

const expandSidebar = () => {
  isExpanded.value = !isExpanded.value;
};

// Template refs
const tippyActions = ref<TippyComponent | null>(null);
</script>
