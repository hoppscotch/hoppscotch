<template>
  <SmartModal
    v-if="show"
    :title="$t('login_to_hoppscotch')"
    dialog
    @close="hideModal"
  >
    <template #body>
      <div v-if="mode === 'sign-in'" class="flex flex-col space-y-2">
        <SmartItem
          :loading="signingInWithGoogle"
          svg="google"
          label="Continue with Google"
          @click.native="signInWithGoogle"
        />
        <SmartItem
          :loading="signingInWithGitHub"
          svg="github"
          label="Continue with GitHub"
          @click.native="signInWithGithub"
        />
        <SmartItem
          icon="mail"
          label="Continue with Email"
          @click.native="mode = 'email'"
        />
      </div>
      <div v-if="mode === 'email'" class="flex flex-col space-y-2">
        <div class="flex items-center relative">
          <input
            id="email"
            v-model="form.email"
            v-focus
            class="input floating-input"
            placeholder=" "
            type="email"
            name="email"
            autocomplete="email"
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
          :label="$t('auth.send_magic_link')"
          @click.native="signInWithEmail"
        />
      </div>
      <div v-if="mode === 'email-sent'" class="flex flex-col px-4">
        <div class="flex flex-col max-w-md justify-center items-center">
          <i class="text-accent material-icons !text-4xl">
            mark_email_unread
          </i>
          <h3 class="font-bold my-2 text-center text-lg">
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
          to="https://github.com/hoppscotch/hoppscotch/wiki/Terms-&-Conditions"
          blank
          label="Terms of Service"
        />
        and
        <SmartAnchor
          class="link"
          to="https://github.com/hoppscotch/hoppscotch/wiki/Privacy-Policy"
          blank
          label="Privacy Policy"
        />.
      </p>
      <p v-if="mode === 'email'" class="text-secondaryLight">
        <SmartAnchor
          class="link"
          label="← All sign in options"
          @click.native="mode = 'sign-in'"
        />
      </p>
      <p
        v-if="mode === 'email-sent'"
        class="flex flex-1 text-secondaryLight justify-between"
      >
        <SmartAnchor
          class="link"
          label="← Re-enter email"
          @click.native="mode = 'email'"
        />
        <SmartAnchor
          class="link"
          :label="$t('action.dismiss')"
          @click.native="hideModal"
        />
      </p>
    </template>
  </SmartModal>
</template>

<script>
import { applySetting } from "~/newstore/settings"
import {
  signInUserWithGoogle,
  getSignInMethodsForEmail,
  signInWithEmailAndPassword,
  signInUserWithGithub,
  setProviderInfo,
  currentUser$,
  signInWithEmail,
} from "~/helpers/fb/auth"
import { setLocalConfig } from "~/newstore/localpersistence"
import { useStreamSubscriber } from "~/helpers/utils/composables"

export default {
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
      this.$toast.info(this.$t("login_success"), {
        icon: "vpn_key",
      })
    },
    async signInWithGoogle() {
      this.signingInWithGoogle = true

      try {
        const { additionalUserInfo } = await signInUserWithGoogle()

        if (additionalUserInfo.isNewUser) {
          this.$toast.info(`${this.$t("action.turn_on")} ${this.$t("sync")}`, {
            icon: "sync",
            duration: null,
            closeOnSwipe: false,
            action: {
              text: this.$t("yes"),
              onClick: (_, toastObject) => {
                applySetting("syncHistory", true)
                applySetting("syncCollections", true)
                applySetting("syncEnvironments", true)
                toastObject.remove()
              },
            },
          })
        }

        this.showLoginSuccess()
      } catch (e) {
        console.error(e)
        // An error happened.
        if (e.code === "auth/account-exists-with-different-credential") {
          // Step 2.
          // User's email already exists.
          // The pending Google credential.
          const pendingCred = e.credential
          // The provider account's email address.
          const email = e.email
          // Get sign-in methods for this email.
          const methods = await getSignInMethodsForEmail(email)

          // Step 3.
          // If the user has several sign-in methods,
          // the first method in the list will be the "recommended" method to use.
          if (methods[0] === "password") {
            // Asks the user their password.
            // In real scenario, you should handle this asynchronously.
            const password = promptUserForPassword() // TODO: implement promptUserForPassword.

            const user = await signInWithEmailAndPassword(email, password)
            await user.linkWithCredential(pendingCred)

            this.showLoginSuccess()

            return
          }

          this.$toast.info(`${this.$t("auth.account_exists")}`, {
            icon: "vpn_key",
            duration: null,
            closeOnSwipe: false,
            action: {
              text: this.$t("yes"),
              onClick: async (_, toastObject) => {
                const { user } = await signInWithGithub()
                await user.linkAndRetrieveDataWithCredential(pendingCred)

                this.showLoginSuccess()

                toastObject.remove()
              },
            },
          })
        }
      }

      this.signingInWithGoogle = false
    },
    async signInWithGithub() {
      this.signingInWithGitHub = true

      try {
        const { credential, additionalUserInfo } = await signInUserWithGithub()

        setProviderInfo(credential.providerId, credential.accessToken)

        if (additionalUserInfo.isNewUser) {
          this.$toast.info(`${this.$t("action.turn_on")} ${this.$t("sync")}`, {
            icon: "sync",
            duration: null,
            closeOnSwipe: false,
            action: {
              text: this.$t("yes"),
              onClick: (_, toastObject) => {
                applySetting("syncHistory", true)
                applySetting("syncCollections", true)
                applySetting("syncEnvironments", true)
                toastObject.remove()
              },
            },
          })
        }

        this.showLoginSuccess()
      } catch (e) {
        console.error(e)
        // An error happened.
        if (e.code === "auth/account-exists-with-different-credential") {
          // Step 2.
          // User's email already exists.
          // The pending Google credential.
          const pendingCred = e.credential
          // The provider account's email address.
          const email = e.email
          // Get sign-in methods for this email.
          const methods = await getSignInMethodsForEmail(email)

          // Step 3.
          // If the user has several sign-in methods,
          // the first method in the list will be the "recommended" method to use.
          if (methods[0] === "password") {
            // Asks the user their password.
            // In real scenario, you should handle this asynchronously.
            const password = promptUserForPassword() // TODO: implement promptUserForPassword.

            const user = await signInWithEmailAndPassword(email, password)
            await user.linkWithCredential(pendingCred)

            this.showLoginSuccess()

            return
          }

          this.$toast.info(`${this.$t("auth.account_exists")}`, {
            icon: "vpn_key",
            duration: null,
            closeOnSwipe: false,
            action: {
              text: this.$t("yes"),
              onClick: async (_, toastObject) => {
                const { user } = await signInUserWithGoogle()
                // TODO: handle deprecation
                await user.linkAndRetrieveDataWithCredential(pendingCred)

                this.showLoginSuccess()

                toastObject.remove()
              },
            },
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
          this.$toast.error(error.message, {
            icon: "error",
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
}
</script>
