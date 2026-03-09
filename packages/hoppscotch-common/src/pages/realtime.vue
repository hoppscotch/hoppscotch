<template>
  <HoppSmartTabs
    v-model="currentTab"
    styles="sticky overflow-x-auto flex-shrink-0 bg-primary top-0 z-10"
    content-styles="!h-[calc(100%-var(--sidebar-primary-sticky-fold)-1px)] !flex"
  >
    <HoppSmartTab
      v-for="(navigation, index) in REALTIME_NAVIGATION"
      :id="navigation.target"
      :key="index"
      :label="navigation.title"
      :icon="navigation.icon"
    >
      <RouterView />
    </HoppSmartTab>
  </HoppSmartTabs>
</template>

<script setup lang="ts">
import { watch, ref, computed } from "vue"
import { RouterView, useRouter, useRoute } from "vue-router"
import { usePageHead } from "~/composables/head"
import { useI18n } from "~/composables/i18n"
import IconWebsocket from "~icons/hopp/websocket"
import IconSocketio from "~icons/hopp/socketio"
import IconMqtt from "~icons/hopp/mqtt"
import IconSse from "~icons/lucide/satellite-dish"

const t = useI18n()
const router = useRouter()
const route = useRoute()

const REALTIME_NAVIGATION = [
  {
    target: "websocket",
    title: t("tab.websocket"),
    icon: IconWebsocket,
  },
  {
    target: "sse",
    title: t("tab.sse"),
    icon: IconSse,
  },
  {
    target: "socketio",
    title: t("tab.socketio"),
    icon: IconSocketio,
  },
  {
    target: "mqtt",
    title: t("tab.mqtt"),
    icon: IconMqtt,
  },
] as const

type RealtimeNavTab = (typeof REALTIME_NAVIGATION)[number]["target"]

const currentTab = ref<RealtimeNavTab>("websocket")

usePageHead({
  title: computed(() => t(`tab.${currentTab.value}`)),
})

// Update the router when the tab is updated
watch(currentTab, (newTab) => {
  router.push(`/realtime/${newTab}`)
})

// Update the tab when router is upgrad
watch(
  route,
  (updateRoute) => {
    const path = updateRoute.path

    if (updateRoute.name?.toString() === "realtime") {
      router.replace(`/realtime/websocket`)
      return
    }

    const destination: string | undefined = path.split("realtime/")[1]

    const target = REALTIME_NAVIGATION.find(
      ({ target }) => target === destination
    )?.target

    if (target) currentTab.value = target
  },
  { immediate: true }
)
</script>
