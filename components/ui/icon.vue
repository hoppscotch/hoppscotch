<template>
  <img class="material-icons" :src="'~assets/icons/' + $t('icon') + '.svg'" :alt="$t('icon')" />
</template>

<script>
export default {
  props: {
    icon: { type: String },
  },
}
</script>
