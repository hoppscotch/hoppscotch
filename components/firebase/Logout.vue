<template>
  <div>
    <ButtonSecondary
      icon="exit_to_app"
      :label="$t('logout')"
      @click.native="logout"
    />
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
