<template>
  <pw-section class="pink" :label="$t('notes')" ref="sync" no-legend>
    <div v-if="fb.currentUser">
      <inputform />
      <feeds />
    </div>
    <div v-else>
      <p class="info">{{ $t("login_first") }}</p>
      <login />
    </div>
  </pw-section>
</template>

<script>
import { fb } from "~/helpers/fb"

export default {
  data() {
    return {
      fb,
    }
  },
}
</script>
