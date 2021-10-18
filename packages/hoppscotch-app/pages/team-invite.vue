<template>
  <div class="flex flex-col min-h-screen items-center justify-between">
    <div
      v-if="invalidLink"
      class="flex flex-1 items-center justify-center flex-col"
    >
      <h1 class="heading text-center">
        {{ $t("team.invalid_invite_link") }}
      </h1>
      <p class="text-center">
        {{ $t("team.invalid_invite_link_description") }}
      </p>
    </div>
    <div v-else class="flex-col flex-1 p-4 flex items-center justify-center">
      <h1 class="heading">{{ $t("team.join_team", { team: "Tesla" }) }}</h1>
      <p class="text-secondaryLight mt-2">
        {{ $t("team.invited_to_team", { owner: "Elon Musk", team: "Tesla" }) }}
      </p>
      <div v-if="currentUser === null" class="mt-8">
        <ButtonPrimary
          :label="$t('auth.login_to_hoppscotch')"
          @click.native="showLogin = true"
        />
      </div>
      <div v-else class="mt-8">
        <ButtonPrimary
          :label="$t('team.join_team', { team: 'Tesla' })"
          :loading="loading"
          :disabled="revokedLink"
          @click.native="joinTeam"
        />
      </div>
      <pre v-if="error" class="p-4 text-red-500">{{ error }}</pre>
      <FirebaseLogin :show="showLogin" @hide-modal="showLogin = false" />
    </div>
    <div class="p-4">
      <ButtonSecondary
        class="tracking-wide !font-bold !text-secondaryDark"
        label="HOPPSCOTCH"
        to="/"
      />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "@nuxtjs/composition-api"
import { initializeFirebase } from "~/helpers/fb"
import { currentUser$ } from "~/helpers/fb/auth"
import { useReadonlyStream } from "~/helpers/utils/composables"

export default defineComponent({
  layout: "empty",
  setup() {
    return {
      currentUser: useReadonlyStream(currentUser$, null),
    }
  },
  data() {
    return {
      invalidLink: false,
      showLogin: false,
      loading: false,
      revokedLink: false,
      error: null,
      teamID: "",
    }
  },
  beforeMount() {
    initializeFirebase()
  },
  mounted() {
    this.teamID = this.$route.query.id
    this.invalidLink = !this.teamID
    // TODO: check revokeTeamInvitation
    // TODO: check login user already a member
  },
  methods: {
    joinTeam() {
      this.loading = true
      // TODO: run join team mutation
      // TODO: show success toast and redirect to home page / error toast
      // this.$router.push({ path: "/" })
      // $toast.success(`${t("team.join")}`, {
      //   icon: "person",
      // })
      // this.$toast.error(this.$t("error.something_went_wrong"), {
      //   icon: "error_outline",
      // })
      // console.error(e)
    },
  },
})
</script>
