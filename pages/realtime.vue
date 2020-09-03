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
  head() {
    return {
      title: `Realtime • ${this.$store.state.name}`,
    }
  },
}
</script>
