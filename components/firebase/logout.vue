<template>
  <div>
    <button class="icon" @click="logout" v-close-popover>
      <exitToAppIcon class="material-icons" />
      <span>{{ $t("logout") }}</span>
    </button>
  </div>
</template>

<script>
import firebase from "firebase/app"
import { fb } from "~/helpers/fb"
import exitToAppIcon from "~/static/icons/exit_to_app-24px.svg?inline"

export default {
  components: { exitToAppIcon },
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
