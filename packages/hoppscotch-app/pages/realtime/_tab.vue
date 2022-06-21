<template>
  <div
    class="flex flex-1 h-full flex-nowrap h-full !overflow-hidden flex flex-1 flex-col h-auto"
  >
    <div
      class="relative tabs hide-scrollbar sticky bg-primary top-0 z-10 border-b border-dividerLight !overflow-visible"
    >
      <div class="flex flex-1">
        <div class="flex justify-between flex-1">
          <div class="flex">
            <NuxtLink
              v-for="(navigation, index) in realtimeNavigation"
              :key="`realtime-navigation-${index}`"
              :to="navigation.target"
              tabindex="0"
            >
              <button
                :key="`realtime-tab-${index}`"
                class="tab"
                :class="[{ active: navigation.target === selectedTab }]"
                role="button"
              >
                <span v-if="navigation.title">{{ navigation.title }}</span>
              </button>
            </NuxtLink>
          </div>
          <div class="flex items-center justify-center"></div>
        </div>
      </div>
    </div>
    <div class="w-full h-full contents">
      <template v-if="selectedTab === 'websocket'">
        <RealtimeWebsocket />
      </template>
      <template v-if="selectedTab === 'sse'">
        <RealtimeSse />
      </template>
      <template v-if="selectedTab === 'socketio'">
        <RealtimeSocketio />
      </template>
      <template v-if="selectedTab === 'mqtt'">
        <RealtimeMqtt />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRoute, useRouter, onMounted, ref } from "@nuxtjs/composition-api"
import { useI18n } from "~/helpers/utils/composables"

const t = useI18n()
const route = useRoute()
const router = useRouter()

const selectedTab = ref("websocket")

const realtimeNavigation = [
  {
    target: "websocket",
    title: t("tab.websocket"),
  },
  {
    target: "sse",
    title: t("tab.sse"),
  },
  {
    target: "socketio",
    title: t("tab.socketio"),
  },
  {
    target: "mqtt",
    title: t("tab.mqtt"),
  },
]

onMounted(() => {
  const { tab } = route.value.params
  if (!tab || !realtimeNavigation.some((nav) => nav.target === tab)) {
    router.push({
      path: "/realtime/websocket",
    })
  } else {
    selectedTab.value = tab
  }
})
</script>

<style scoped lang="scss">
.tabs {
  @apply flex;
  @apply whitespace-nowrap;
  @apply overflow-auto;
  @apply flex-shrink-0;

  // &::after {
  //   @apply absolute;
  //   @apply inset-x-0;
  //   @apply bottom-0;
  //   @apply bg-dividerLight;
  //   @apply z-1;
  //   @apply h-0.5;

  //   content: "";
  // }

  .tab {
    @apply relative;
    @apply flex;
    @apply flex-shrink-0;
    @apply items-center;
    @apply justify-center;
    @apply py-2 px-4;
    @apply text-secondary;
    @apply font-semibold;
    @apply cursor-pointer;
    @apply hover:text-secondaryDark;
    @apply focus:outline-none;
    @apply focus-visible:text-secondaryDark;

    &::after {
      @apply absolute;
      @apply left-4;
      @apply right-4;
      @apply bottom-0;
      @apply bg-transparent;
      @apply z-2;
      @apply h-0.5;

      content: "";
    }

    &:focus::after {
      @apply bg-divider;
    }

    &.active {
      @apply text-secondaryDark;

      .tab-info {
        @apply text-secondary;
        @apply border-dividerDark;
      }

      &::after {
        @apply bg-accent;
      }
    }
  }
}
</style>
