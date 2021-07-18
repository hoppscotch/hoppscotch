<template>
  <SmartTabs>
    <SmartTab id="websocket" :label="$t('websocket')" :selected="true">
      <RealtimeWebsocket />
    </SmartTab>
    <SmartTab id="sse" :label="$t('sse')">
      <RealtimeSse />
    </SmartTab>
    <SmartTab id="socketio" :label="$t('socketio')">
      <RealtimeSocketio />
    </SmartTab>
    <SmartTab id="mqtt" :label="$t('mqtt')">
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
