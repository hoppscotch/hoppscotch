<template>
  <AppSection ref="sync" :label="$t('notes')">
    <div v-if="fb.currentUser">
      <FirebaseInputform />
      <FirebaseFeeds />
    </div>
    <div v-else>
      <p class="info">{{ $t("login_first") }}</p>
      <FirebaseLogin @show-email="showEmail = true" />
    </div>
    <FirebaseEmail :show="showEmail" @hide-modal="showEmail = false" />
  </AppSection>
</template>

<script>
import { fb } from "~/helpers/fb"

export default {
  data() {
    return {
      fb,
      showEmail: false,
    }
  },
}
</script>
