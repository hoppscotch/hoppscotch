<template>
  <AppSection ref="sync" :label="$t('notes')" no-legend>
    <div v-if="currentUser">
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
import { currentUser$ } from "~/helpers/fb/auth"

export default {
  subscriptions() {
    return {
      currentUser: currentUser$,
    }
  },
  data() {
    return {
      showEmail: false,
    }
  },
}
</script>
