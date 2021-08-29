<template>
  <SmartTabs
    class="h-full overflow-hidden"
    styles="sticky bg-primary top-0 z-10 border-b border-dividerLight !overflow-visible"
  >
    <SmartTab
      id="websocket"
      :label="$t('tab.websocket')"
      :selected="true"
      style="height: calc(100% - var(--sidebar-primary-sticky-fold))"
    >
      <RealtimeWebsocket />
    </SmartTab>
    <SmartTab
      id="sse"
      :label="$t('tab.sse')"
      style="height: calc(100% - var(--sidebar-primary-sticky-fold))"
    >
      <RealtimeSse />
    </SmartTab>
    <SmartTab
      id="socketio"
      :label="$t('tab.socketio')"
      style="height: calc(100% - var(--sidebar-primary-sticky-fold))"
    >
      <RealtimeSocketio />
    </SmartTab>
    <SmartTab
      id="mqtt"
      :label="$t('tab.mqtt')"
      style="height: calc(100% - var(--sidebar-primary-sticky-fold))"
    >
      <RealtimeMqtt />
    </SmartTab>
  </SmartTabs>
</template>

<script>
import { defineComponent } from "@nuxtjs/composition-api"

export default defineComponent({
  head() {
    return {
      title: `${this.$t("navigation.realtime")} • Hoppscotch`,
    }
  },
})
</script>
