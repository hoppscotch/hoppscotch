<template>
  <AppSection id="response" ref="response" :label="$t('response')" no-legend>
    <HttpResponseMeta :response="response" :active="active" />
    <div v-if="response.body && response.body !== $t('loading')">
      <LensesResponseBodyRenderer :response="response" />
    </div>
  </AppSection>
</template>

<script>
export default {
  props: {
    response: {
      type: Object,
      default: () => {},
    },
    active: {
      type: Boolean,
      default: false,
    },
  },
}
</script>
