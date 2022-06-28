<template>
  <SmartTabs v-model="currentTab">
    <SmartTab
      v-for="{ target, title } in REALTIME_NAVIGATION"
      :id="target"
      :key="target"
      :label="title"
    >
      <NuxtChild />
    </SmartTab>
  </SmartTabs>
</template>

<script setup lang="ts">
import { watch, ref, useRouter, useRoute } from "@nuxtjs/composition-api"
import { useI18n } from "~/helpers/utils/composables"

const t = useI18n()
const router = useRouter()
const route = useRoute()

const REALTIME_NAVIGATION = [
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
] as const

type RealtimeNavTab = typeof REALTIME_NAVIGATION[number]["target"]

const currentTab = ref<RealtimeNavTab>("websocket")

// Update the router when the tab is updated
watch(currentTab, (newTab) => {
  router.push(`/realtime/${newTab}`)
})

// Update the tab when router is upgrad
watch(
  route,
  (updateRoute) => {
    if (updateRoute.path === "/realtime") router.replace("/realtime/websocket")

    const destination: string | undefined =
      updateRoute.path.split("/realtime/")[1]

    const target = REALTIME_NAVIGATION.find(
      ({ target }) => target === destination
    )?.target

    if (target) currentTab.value = target
  },
  { immediate: true }
)
</script>
