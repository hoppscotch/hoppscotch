<template>
  <div class="page">
    <section id="options">
      <tabs>
        <tab :id="'websocket'" :label="$t('websocket')" :selected="true">
          <websocket />
        </tab>

        <tab :id="'sse'" :label="$t('sse')">
          <sse />
        </tab>

        <tab :id="'socketio'" :label="$t('socketio')">
          <socketio />
        </tab>

        <tab :id="'mqtt'" :label="$t('mqtt')">
          <mqtt />
        </tab>
      </tabs>
    </section>
  </div>
</template>

<script>
export default {
  components: {
    "pw-section": () => import("~/components/layout/section"),
    tabs: () => import("~/components/ui/tabs"),
    tab: () => import("~/components/ui/tab"),
    websocket: () => import("~/components/realtime/websocket"),
    sse: () => import("~/components/realtime/sse"),
    socketio: () => import("~/components/realtime/socketio"),
    mqtt: () => import("~/components/realtime/mqtt"),
  },
  head() {
    return {
      title: `Realtime • ${this.$store.state.name}`,
    }
  },
}
</script>
