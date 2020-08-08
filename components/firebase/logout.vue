<template>
  <div>
    <button class="icon" @click="logout" v-close-popover>
      <icon icon="exit_to_app" />
      <span>{{ $t("logout") }}</span>
    </button>
  </div>
</template>

<script>
import firebase from "firebase/app"
import { fb } from "~/helpers/fb"

export default {
  data() {
    return {
      fb,
    }
  },
  methods: {
    logout() {
      fb.currentUser = null
      const self = this
      firebase
        .auth()
        .signOut()
        .catch((err) => {
          self.$toast.show(err.message || err, {
            icon: "error",
          })
        })
      self.$toast.info(this.$t("logged_out"), {
        icon: "vpn_key",
      })
    },
  },
}
</script>
