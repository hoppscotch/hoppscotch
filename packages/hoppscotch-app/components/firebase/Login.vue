<template>
  <SmartModal
    v-if="show"
    dialog
    :title="`${$t('auth.login_to_hoppscotch')}`"
    max-width="sm:max-w-md"
    @close="hideModal"
  >
    <template #body>
      <div v-if="mode === 'sign-in'" class="flex flex-col px-2 space-y-2">
        <SmartItem
          :loading="signingInWithGitHub"
          svg="auth/github"
          :label="`${$t('auth.continue_with_github')}`"
          @click.native="signInWithGithub"
        />
        <SmartItem
          :loading="signingInWithGoogle"
          svg="auth/google"
          :label="`${$t('auth.continue_with_google')}`"
          @click.native="signInWithGoogle"
        />
        <SmartItem
          :loading="signingInWithMicrosoft"
          svg="auth/microsoft"
          :label="`${$t('auth.continue_with_microsoft')}`"
          @click.native="signInWithMicrosoft"
        />
        <SmartItem
          svg="auth/email"
          :label="`${$t('auth.continue_with_email')}`"
          @click.native="mode = 'email'"
        />
      </div>
      <form
        v-if="mode === 'email'"
        class="flex flex-col space-y-2"
        @submit.prevent="signInWithEmail"
      >
        <div class="flex flex-col">
          <input
            id="email"
            v-model="form.email"
            v-focus
            class="input floating-input"
            placeholder=" "
            type="email"
            name="email"
            autocomplete="off"
            required
            spellcheck="false"
            autofocus
          />
          <label for="email">
            {{ $t("auth.email") }}
          </label>
        </div>
        <ButtonPrimary
          :loading="signingInWithEmail"
          type="submit"
          :label="`${$t('auth.send_magic_link')}`"
        />
      </form>
      <div v-if="mode === 'email-sent'" class="flex flex-col px-4">
        <div class="flex flex-col items-center justify-center max-w-md">
          <SmartIcon class="w-6 h-6 text-accent" name="inbox" />
          <h3 class="my-2 text-lg text-center">
            {{ $t("auth.we_sent_magic_link") }}
          </h3>
          <p class="text-center">
            {{
              $t("auth.we_sent_magic_link_description", { email: form.email })
            }}
          </p>
        </div>
      </div>
    </template>
    <template #footer>
      <p v-if="mode === 'sign-in'" class="text-secondaryLight">
        By signing in, you are agreeing to our
        <SmartAnchor
          class="link"
          to="https://docs.hoppscotch.io/terms"
          blank
          label="Terms of Service"
        />
        and
        <SmartAnchor
          class="link"
          to="https://docs.hoppscotch.io/privacy"
          blank
          label="Privacy Policy"
        />.
      </p>
      <p v-if="mode === 'email'" class="text-secondaryLight">
        <SmartAnchor
          class="link"
          :label="`← \xA0 ${$t('auth.all_sign_in_options')}`"
          @click.native="mode = 'sign-in'"
        />
      </p>
      <p
        v-if="mode === 'email-sent'"
        class="flex justify-between flex-1 text-secondaryLight"
      >
        <SmartAnchor
          class="link"
          :label="`← \xA0 ${$t('auth.re_enter_email')}`"
          @click.native="mode = 'email'"
        />
        <SmartAnchor
          class="link"
          :label="`${$t('action.dismiss')}`"
          @click.native="hideModal"
        />
      </p>
    </template>
  </SmartModal>
</template>

<script lang="ts">
import { defineComponent } from "@nuxtjs/composition-api"
import {
  signInUserWithGoogle,
  signInUserWithGithub,
  signInUserWithMicrosoft,
  setProviderInfo,
  currentUser$,
  signInWithEmail,
  linkWithFBCredential,
  linkWithFBCredentialFromAuthError,
  getGithubCredentialFromResult,
} from "~/helpers/fb/auth"
import { setLocalConfig } from "~/newstore/localpersistence"
import { useStreamSubscriber } from "~/helpers/utils/composables"

export default defineComponent({
  props: {
    show: Boolean,
  },
  setup() {
    const { subscribeToStream } = useStreamSubscriber()

    return {
      subscribeToStream,
    }
  },
  data() {
    return {
      form: {
        email: "",
      },
      signingInWithGoogle: false,
      signingInWithGitHub: false,
      signingInWithMicrosoft: false,
      signingInWithEmail: false,
      mode: "sign-in",
    }
  },
  mounted() {
    this.subscribeToStream(currentUser$, (user) => {
      if (user) this.hideModal()
    })
  },
  methods: {
    showLoginSuccess() {
      this.$toast.success(`${this.$t("auth.login_success")}`)
    },
    async signInWithGoogle() {
      this.signingInWithGoogle = true

      try {
        await signInUserWithGoogle()
        this.showLoginSuccess()
      } catch (e) {
        console.error(e)
        // An error happened.
        if (e.code === "auth/account-exists-with-different-credential") {
          // Step 2.
          // User's email already exists.
          // The pending Google credential.
          const pendingCred = e.credential
          this.$toast.info(`${this.$t("auth.account_exists")}`, {
            duration: 0,
            closeOnSwipe: false,
            action: {
              text: `${this.$t("action.yes")}`,
              onClick: async (_, toastObject) => {
                const { user } = await signInUserWithGithub()
                await linkWithFBCredential(user, pendingCred)

                this.showLoginSuccess()

                toastObject.goAway(0)
              },
            },
          })
        } else {
          this.$toast.error(`${this.$t("error.something_went_wrong")}`)
        }
      }

      this.signingInWithGoogle = false
    },
    async signInWithGithub() {
      this.signingInWithGitHub = true

      try {
        const result = await signInUserWithGithub()
        const credential = getGithubCredentialFromResult(result)!
        const token = credential.accessToken

        setProviderInfo(result.providerId!, token!)

        this.showLoginSuccess()
      } catch (e) {
        console.error(e)
        // An error happened.
        if (e.code === "auth/account-exists-with-different-credential") {
          // Step 2.
          // User's email already exists.
          this.$toast.info(`${this.$t("auth.account_exists")}`, {
            duration: 0,
            closeOnSwipe: false,
            action: {
              text: `${this.$t("action.yes")}`,
              onClick: async (_, toastObject) => {
                const { user } = await signInUserWithGoogle()
                await linkWithFBCredentialFromAuthError(user, e)

                this.showLoginSuccess()

                toastObject.goAway(0)
              },
            },
          })
        } else {
          this.$toast.error(`${this.$t("error.something_went_wrong")}`)
        }
      }

      this.signingInWithGitHub = false
    },
    async signInWithMicrosoft() {
      this.signingInWithMicrosoft = true

      try {
        await signInUserWithMicrosoft()
        this.showLoginSuccess()
      } catch (e) {
        console.error(e)
        // An error happened.
        if (e.code === "auth/account-exists-with-different-credential") {
          // Step 2.
          // User's email already exists.
          // The pending Microsoft credential.
          const pendingCred = e.credential
          this.$toast.info(`${this.$t("auth.account_exists")}`, {
            duration: 0,
            closeOnSwipe: false,
            action: {
              text: `${this.$t("action.yes")}`,
              onClick: async (_, toastObject) => {
                const { user } = await signInUserWithGithub()
                await linkWithFBCredential(user, pendingCred)

                this.showLoginSuccess()

                toastObject.goAway(0)
              },
            },
          })
        } else {
          this.$toast.error(`${this.$t("error.something_went_wrong")}`)
        }
      }

      this.signingInWithMicrosoft = false
    },
    async signInWithEmail() {
      this.signingInWithEmail = true

      const actionCodeSettings = {
        url: `${process.env.BASE_URL}/enter`,
        handleCodeInApp: true,
      }
      await signInWithEmail(this.form.email, actionCodeSettings)
        .then(() => {
          this.mode = "email-sent"
          setLocalConfig("emailForSignIn", this.form.email)
        })
        .catch((e) => {
          console.error(e)
          this.$toast.error(e.message)
          this.signingInWithEmail = false
        })
        .finally(() => {
          this.signingInWithEmail = false
        })
    },
    hideModal() {
      this.mode = "sign-in"
      this.$toast.clear()
      this.$emit("hide-modal")
    },
  },
})
</script>
