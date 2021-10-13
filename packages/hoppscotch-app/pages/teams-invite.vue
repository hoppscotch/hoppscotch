<template>
  <div class="flex flex-col min-h-screen items-center justify-center">
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
        @click.native="joinTeam"
      />
    </div>
    <!-- <SmartSpinner v-if="loading" />
    <SmartLoadingIndicator v-else />
    <pre v-if="error">{{ error }}</pre> -->
    <FirebaseLogin :show="showLogin" @hide-modal="showLogin = false" />
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
      showLogin: false,
      //  loading : false
      //  error : null
    }
  },
  beforeMount() {
    initializeFirebase()
  },
  async mounted() {},
  methods: {
    joinTeam() {},
  },
})
</script>
