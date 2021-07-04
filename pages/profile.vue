<template>
  <div>
    <ButtonPrimary
      v-if="currentUser === null"
      label="Get Started"
      @click.native="showLogin = true"
    />
    <FirebaseLogin :show="showLogin" @hide-modal="showLogin = false" />
  </div>
</template>

<script>
import { currentUser$ } from "~/helpers/fb/auth"

export default {
  data() {
    return {
      showLogin: false,
    }
  },
  subscriptions() {
    return {
      currentUser: currentUser$,
    }
  },
}
</script>
