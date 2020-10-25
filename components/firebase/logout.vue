<template>
  <div>
    <button class="icon" @click="logout" v-close-popover>
      <exitToAppIcon class="material-icons" />
      <span>{{ $t("logout") }}</span>
    </button>
  </div>
</template>

<script>
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
