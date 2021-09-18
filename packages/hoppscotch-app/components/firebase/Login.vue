<template>
  <SmartModal
    v-if="show"
    :title="`${$t('auth.login_to_hoppscotch')}`"
    dialog
    @close="hideModal"
  >
    <template #body>
      <div v-if="mode === 'sign-in'" class="flex flex-col space-y-2 px-2">
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
          icon="mail"
          :label="`${$t('auth.continue_with_email')}`"
          @click.native="mode = 'email'"
        />
      </div>
      <div v-if="mode === 'email'" class="flex flex-col space-y-2">
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
            @keyup.enter="signInWithEmail"
          />
          <label for="email">
            {{ $t("auth.email") }}
          </label>
        </div>
        <ButtonPrimary
          :loading="signingInWithEmail"
          :disabled="
            form.email.length !== 0
              ? emailRegex.test(form.email)
                ? false
                : true
              : true
          "
          type="button"
          :label="`${$t('auth.send_magic_link')}`"
          @click.native="signInWithEmail"
        />
      </div>
      <div v-if="mode === 'email-sent'" class="flex flex-col px-4">
        <div class="flex flex-col max-w-md justify-center items-center">
          <SmartIcon class="h-6 text-accent w-6" name="inbox" />
          <h3 class="my-2 text-center text-lg">
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
        class="flex flex-1 text-secondaryLight justify-between"
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
  setProviderInfo,
  currentUser$,
  signInWithEmail,
  linkWithFBCredential,
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
      signingInWithEmail: false,
      emailRegex:
        /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/,
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
      this.$toast.success(`${this.$t("auth.login_success")}`, {
        icon: "vpn_key",
      })
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
            icon: "vpn_key",
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
          this.$toast.error(`${this.$t("error.something_went_wrong")}`, {
            icon: "error_outline",
          })
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
          // The pending Google credential.
          const pendingCred = e.credential
          this.$toast.info(`${this.$t("auth.account_exists")}`, {
            icon: "vpn_key",
            duration: 0,
            closeOnSwipe: false,
            action: {
              text: `${this.$t("action.yes")}`,
              onClick: async (_, toastObject) => {
                const { user } = await signInUserWithGoogle()
                await linkWithFBCredential(user, pendingCred)

                this.showLoginSuccess()

                toastObject.goAway(0)
              },
            },
          })
        } else {
          this.$toast.error(`${this.$t("error.something_went_wrong")}`, {
            icon: "error_outline",
          })
        }
      }

      this.signingInWithGitHub = false
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
          this.$toast.error(e.message, {
            icon: "error_outline",
          })
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
