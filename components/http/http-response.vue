<template>
  <pw-section class="purple" id="response" :label="$t('response')" ref="response" no-legend>
    <http-response-meta :response="response" :active="active" />
    <div v-if="response.body && response.body !== $t('loading')">
      <response-body-renderer :response="response" />
    </div>
  </pw-section>
</template>

<script>
export default {
  props: {
    response: {
      type: Object,
      default: {},
    },
    active: {
      type: Boolean,
      default: false,
    },
  },
}
</script>
