<template>
  <AppSection ref="sync" :label="$t('notes')" no-legend>
    <div v-if="fb.currentUser">
      <FirebaseInputform />
      <FirebaseFeeds />
    </div>
    <div v-else>
      <p class="info">{{ $t("login_first") }}</p>
      <FirebaseLogin />
    </div>
  </AppSection>
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
