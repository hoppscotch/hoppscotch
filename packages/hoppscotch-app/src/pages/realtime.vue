<template>
  <SmartTabs v-model="currentTab">
    <SmartTab
      v-for="{ target, title } in REALTIME_NAVIGATION"
      :id="target"
      :key="target"
      :label="title"
    >
      <RouterView />
    </SmartTab>
  </SmartTabs>
</template>

<script setup lang="ts">
import { watch, ref, computed } from "vue"
import { RouterView, useRouter, useRoute } from "vue-router"
import { usePageHead } from "~/composables/head"
import { useI18n } from "~/composables/i18n"

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

<route lang="yaml">
meta:
  layout: default
</route>
