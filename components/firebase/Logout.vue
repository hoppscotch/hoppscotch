<template>
  <div class="flex">
    <SmartItem
      icon="exit_to_app"
      :label="$t('auth.logout')"
      @click.native="
        $emit('confirm-logout')
        confirmLogout = true
      "
    />
    <SmartConfirmModal
      :show="confirmLogout"
      :title="$t('confirm.logout')"
      @hide-modal="confirmLogout = false"
      @resolve="logout"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent } from "@nuxtjs/composition-api"
import { signOutUser } from "~/helpers/fb/auth"

export default defineComponent({
  data() {
    return {
      confirmLogout: false,
    }
  },
  methods: {
    async logout() {
      try {
        await signOutUser()
        this.$toast.success(this.$t("auth.logged_out").toString(), {
          icon: "vpn_key",
        })
      } catch (e) {
        console.error(e)
        this.$toast.error(this.$t("error.something_went_wrong").toString(), {
          icon: "error_outline",
        })
      }
    },
  },
})
</script>
