<template>
  <div class="flex flex-col min-h-screen items-center justify-between">
    <div
      v-if="invalidLink"
      class="flex flex-1 items-center justify-center flex-col"
    >
      <i class="opacity-75 pb-2 material-icons">report</i>
      <h1 class="heading text-center">
        {{ $t("team.invalid_invite_link") }}
      </h1>
      <p class="text-center">
        {{ $t("team.invalid_invite_link_description") }}
      </p>
    </div>
    <div
      v-else-if="currentUser === null"
      class="flex-col flex-1 p-4 flex items-center justify-center"
    >
      <h1 class="heading">{{ $t("team.login_to_continue") }}</h1>
      <p class="mt-2">{{ $t("team.login_to_continue_description") }}</p>
      <ButtonPrimary
        :label="$t('auth.login_to_hoppscotch')"
        class="mt-8"
        @click.native="showLogin = true"
      />
    </div>
    <div v-else class="flex-col flex-1 p-4 flex items-center justify-center">
      <div
        v-if="inviteDetails.loading"
        class="flex-col flex-1 p-4 flex items-center justify-center"
      >
        <SmartSpinner />
      </div>
      <div v-else>
        <div
          v-if="!inviteDetails.loading && E.isLeft(inviteDetails.data)"
          class="flex flex-col p-4 items-center"
        >
          <i class="mb-4 material-icons">help_outline</i>
          {{ $t("error.something_went_wrong") }}
        </div>
        <div
          v-if="!inviteDetails.loading && E.isRight(inviteDetails.data)"
          class="flex-col flex-1 p-4 flex items-center justify-center"
        >
          <h1 class="heading">
            {{
              $t("team.join_team", {
                team: inviteDetails.data.right.teamInvitation.team.name,
              })
            }}
          </h1>
          <p class="text-secondaryLight mt-2">
            {{
              $t("team.invited_to_team", {
                owner:
                  inviteDetails.data.right.teamInvitation.creator.displayName,
                team: inviteDetails.data.right.teamInvitation.team.name,
              })
            }}
          </p>
          <div class="mt-8">
            <ButtonPrimary
              :label="
                $t('team.join_team', {
                  team: inviteDetails.data.right.teamInvitation.team.name,
                })
              "
              :loading="loading"
              :disabled="revokedLink"
              @click.native="joinTeam"
            />
          </div>
          <pre v-if="error" class="p-4 text-red-500">{{ error }}</pre>
        </div>
      </div>
    </div>
    <div class="p-4">
      <ButtonSecondary
        class="tracking-wide !font-bold !text-secondaryDark"
        label="HOPPSCOTCH"
        to="/"
      />
    </div>
    <FirebaseLogin :show="showLogin" @hide-modal="showLogin = false" />
  </div>
</template>

<script lang="ts">
import { defineComponent, useRoute } from "@nuxtjs/composition-api"
import * as E from "fp-ts/Either"
import * as TE from "fp-ts/TaskEither"
import { pipe } from "fp-ts/function"
import { useGQLQuery } from "~/helpers/backend/GQLClient"
import {
  GetInviteDetailsDocument,
  GetInviteDetailsQuery,
  GetInviteDetailsQueryVariables,
} from "~/helpers/backend/graphql"
import { acceptTeamInvitation } from "~/helpers/backend/mutations/TeamInvitation"
import { initializeFirebase } from "~/helpers/fb"
import { currentUser$, onLoggedIn } from "~/helpers/fb/auth"
import { useReadonlyStream } from "~/helpers/utils/composables"

type GetInviteDetailsError = "team_invite/not_valid_viewer"

export default defineComponent({
  layout: "empty",

  setup() {
    const route = useRoute()

    const inviteDetails = useGQLQuery<
      GetInviteDetailsQuery,
      GetInviteDetailsQueryVariables,
      GetInviteDetailsError
    >({
      query: GetInviteDetailsDocument,
      variables: {
        inviteID: route.value.query.id as string,
      },
      defer: true,
    })

    onLoggedIn(() => {
      console.log("loog aayi")

      if (typeof route.value.query.id === "string") {
        console.log("query run aayi", route.value.query.id)

        inviteDetails.execute({
          inviteID: route.value.query.id,
        })
      }
    })

    return {
      E,
      inviteDetails,
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
      inviteID: "",
    }
  },
  beforeMount() {
    initializeFirebase()
  },
  mounted() {
    if (typeof this.$route.query.id === "string") {
      this.inviteID = this.$route.query.id
    }
    this.invalidLink = !this.inviteID
    // TODO: check revokeTeamInvitation
    // TODO: check login user already a member
  },
  methods: {
    joinTeam() {
      this.loading = true
      pipe(
        acceptTeamInvitation(this.inviteID),
        TE.matchW(
          () => {
            this.loading = false
            this.$toast.error(this.$t("error.something_went_wrong"), {
              icon: "error_outline",
            })
          },
          () => {
            this.loading = false
            this.$router.push("/")
          }
        )
      )()
    },
  },
})
</script>
