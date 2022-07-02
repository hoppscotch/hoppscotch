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
import { useI18n, useI18nPathInfo } from "~/helpers/utils/composables"

const t = useI18n()
const { localePath, getRouteBaseName } = useI18nPathInfo()
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
  router.push(localePath(`/realtime/${newTab}`))
})

// Update the tab when router is upgrad
watch(
  route,
  (updateRoute) => {
    const path = getRouteBaseName(updateRoute)

    if (path.endsWith("realtime")) {
      router.replace(localePath(`/realtime/websocket`))
      return
    }

    const destination: string | undefined = path.split("realtime-")[1]

    const target = REALTIME_NAVIGATION.find(
      ({ target }) => target === destination
    )?.target

    if (target) currentTab.value = target
  },
  { immediate: true }
)
</script>
