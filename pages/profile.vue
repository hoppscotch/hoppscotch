<template>
  <div>
    <ButtonPrimary
      v-if="currentUser === null"
      label="Get Started"
      @click.native="showLogin = true"
    />
    <div v-if="currentBackendUser && currentBackendUser.eaInvited">
      <Teams />
    </div>
    <FirebaseLogin :show="showLogin" @hide-modal="showLogin = false" />
  </div>
</template>

<script>
import { currentUser$ } from "~/helpers/fb/auth"
import { currentUserInfo$ } from "~/helpers/teams/BackendUserInfo"

export default {
  data() {
    return {
      showLogin: false,
      currentBackendUser: null,
    }
  },
  subscriptions() {
    return {
      currentUser: currentUser$,

      // Teams feature flag
      currentBackendUser: currentUserInfo$,
    }
  },
}
</script>
