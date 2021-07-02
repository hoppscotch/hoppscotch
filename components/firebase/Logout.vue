<template>
  <div>
    <button class="icon button" @click="logout">
      <i class="material-icons">exit_to_app</i>
      <span>{{ $t("logout") }}</span>
    </button>
  </div>
</template>

<script lang="ts">
import Vue from "vue"
import { signOutUser } from "~/helpers/fb/auth"

export default Vue.extend({
  methods: {
    async logout() {
      try {
        await signOutUser()

        this.$toast.info(this.$t("logged_out").toString(), {
          icon: "vpn_key",
        })
      } catch (err) {
        this.$toast.show(err.message || err, {
          icon: "error",
        })
      }
    },
  },
})
</script>
