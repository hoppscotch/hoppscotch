<template>
  <div>
    <div v-if="mode === 'sign-in'" class="flex flex-col space-y-2">
      <SmartItem
        svg="google"
        label="Continue with Google"
        @click.native="signInWithGoogle"
      />
      <SmartItem
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
    <p v-if="mode === 'sign-in'" class="mx-4 mt-8 text-secondaryLight text-xs">
      By signing in, you are agreeing to our
      <SmartAnchor class="link" to="/index" label="Terms of Service" />
      and
      <SmartAnchor class="link" to="/index" label="Privacy Policy" />.
    </p>
    <div v-if="mode === 'email'" class="flex items-center px-4">
      <label for="email"> Email </label>
      <input
        id="email"
        v-model="form.email"
        class="flex flex-1 ml-4 rounded px-4 py-2 outline-none"
        type="email"
        name="email"
        placeholder="you@mail.com"
        autocomplete="email"
        required
        spellcheck="false"
        autofocus
        @keyup.enter="signInWithEmail"
      />
    </div>
    <div v-if="mode === 'email'">
      <div class="flex flex-col">
        <ButtonPrimary
          :loading="signingInWithEmail"
          class="mx-4 mt-4"
          :disabled="
            form.email.length !== 0
              ? emailRegex.test(form.email)
                ? false
                : true
              : true
          "
          type="button"
          tabindex="-1"
          :label="$t('send_magic_link')"
          @click.native="signInWithEmail"
        />
      </div>
      <p class="mx-4 mt-8 text-secondaryLight text-xs">
        Back to
        <SmartAnchor
          class="link"
          to="#"
          label="all sign in options"
          @click.native="mode = 'sign-in'"
        />.
      </p>
    </div>
    <div v-if="mode === 'email-sent'">
      <div class="flex flex-col items-center">
        <div class="flex justify-center max-w-md p-4 items-center flex-col">
          <i class="material-icons text-accent" style="font-size: 64px">
            verified
          </i>
          <h3 class="font-bold my-2 text-center text-xl">
            {{ $t("we_sent_magic_link") }}
          </h3>
          <p class="text-center">
            {{ $t("we_sent_magic_link_description", { email: form.email }) }}
          </p>
          <p class="mt-4 text-secondaryLight">{{ $t("check_your_inbox") }}</p>
        </div>
      </div>
    </div>
  </div>
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

export default {
  data() {
    return {
      form: {
        email: "",
      },
      signingInWithEmail: false,
      emailRegex:
        /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/,
      mode: "sign-in",
    }
  },
  mounted() {
    this.$subscribeTo(currentUser$, (user) => {
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
      try {
        const { additionalUserInfo } = await signInUserWithGoogle()

        if (additionalUserInfo.isNewUser) {
          this.$toast.info(`${this.$t("turn_on")} ${this.$t("sync")}`, {
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
      } catch (err) {
        console.log(err)
        // An error happened.
        if (err.code === "auth/account-exists-with-different-credential") {
          // Step 2.
          // User's email already exists.
          // The pending Google credential.
          const pendingCred = err.credential
          // The provider account's email address.
          const email = err.email
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

          this.$toast.info(`${this.$t("account_exists")}`, {
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
    },
    async signInWithGithub() {
      try {
        const { credential, additionalUserInfo } = await signInUserWithGithub()

        setProviderInfo(credential.providerId, credential.accessToken)

        if (additionalUserInfo.isNewUser) {
          this.$toast.info(`${this.$t("turn_on")} ${this.$t("sync")}`, {
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
      } catch (err) {
        console.log(err)
        // An error happened.
        if (err.code === "auth/account-exists-with-different-credential") {
          // Step 2.
          // User's email already exists.
          // The pending Google credential.
          const pendingCred = err.credential
          // The provider account's email address.
          const email = err.email
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

          this.$toast.info(`${this.$t("account_exists")}`, {
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
        .catch((error) => {
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
