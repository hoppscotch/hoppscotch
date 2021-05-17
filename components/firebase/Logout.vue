<template>
  <div>
    <button v-close-popover class="icon" @click="logout">
      <i class="material-icons">exit_to_app</i>
      <span>{{ $t("logout") }}</span>
    </button>
  </div>
</template>

<script>
import { fb } from "~/helpers/fb"

export default {
  data() {
    return {
      fb,
    }
  },
  methods: {
    async logout() {
      try {
        await fb.signOutUser()

        this.$toast.info(this.$t("logged_out"), {
          icon: "vpn_key",
        })
      } catch (err) {
        this.$toast.show(err.message || err, {
          icon: "error",
        })
      }
    },
  },
}
</script>
