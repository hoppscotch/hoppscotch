<template>
  <SmartTabs
    class="h-full overflow-hidden"
    styles="sticky top-0 z-10 !overflow-visible"
  >
    <SmartTab
      id="websocket"
      :label="$t('tab.websocket')"
      :selected="true"
      class="h-full"
    >
      <RealtimeWebsocket />
    </SmartTab>
    <SmartTab id="sse" :label="$t('sse')" class="h-full">
      <RealtimeSse />
    </SmartTab>
    <SmartTab id="socketio" :label="$t('socketio')" class="h-full">
      <RealtimeSocketio />
    </SmartTab>
    <SmartTab id="mqtt" :label="$t('tab.mqtt')" class="h-full">
      <RealtimeMqtt />
    </SmartTab>
  </SmartTabs>
</template>

<script>
export default {
  head() {
    return {
      title: `Realtime • Hoppscotch`,
    }
  },
}
</script>
