<template>
  <HoppSmartModal
    v-if="show"
    dialog
    :title="`${t('auth.login_to_hoppscotch')}`"
    styles="sm:max-w-md"
    @close="hideModal"
  >
    <template #body>
      <div v-if="mode === 'sign-in'" class="flex flex-col space-y-2">
        <HoppSmartItem
          :loading="signingInWithGitHub"
          :icon="IconGithub"
          :label="`${t('auth.continue_with_github')}`"
          @click="signInWithGithub"
        />
        <HoppSmartItem
          :loading="signingInWithGoogle"
          :icon="IconGoogle"
          :label="`${t('auth.continue_with_google')}`"
          @click="signInWithGoogle"
        />
        <HoppSmartItem
          :loading="signingInWithMicrosoft"
          :icon="IconMicrosoft"
          :label="`${t('auth.continue_with_microsoft')}`"
          @click="signInWithMicrosoft"
        />
        <HoppSmartItem
          :icon="IconEmail"
          :label="`${t('auth.continue_with_email')}`"
          @click="mode = 'email'"
        />

        <HoppSmartItem
          v-for="loginItem in additonalLoginItems"
          :key="loginItem.id"
          :icon="loginItem.icon"
          :label="loginItem.text(t)"
          @click="doAdditionalLoginItemClickAction(loginItem)"
        />
      </div>
      <form
        v-if="mode === 'email'"
        class="flex flex-col space-y-2"
        @submit.prevent="signInWithEmail"
      >
        <HoppSmartInput
          v-model="form.email"
          type="email"
          placeholder=" "
          :label="t('auth.email')"
          input-styles="floating-input"
        />

        <HoppButtonPrimary
          :loading="signingInWithEmail"
          type="submit"
          :label="`${t('auth.send_magic_link')}`"
        />
      </form>
      <div v-if="mode === 'email-sent'" class="flex flex-col px-4">
        <div class="flex flex-col items-center justify-center max-w-md">
          <icon-lucide-inbox class="w-6 h-6 text-accent" />
          <h3 class="my-2 text-lg text-center">
            {{ t("auth.we_sent_magic_link") }}
          </h3>
          <p class="text-center">
            {{
              t("auth.we_sent_magic_link_description", { email: form.email })
            }}
          </p>
        </div>
      </div>
    </template>
    <template #footer>
      <div
        v-if="mode === 'sign-in' && tosLink && privacyPolicyLink"
        class="text-secondaryLight text-tiny"
      >
        By signing in, you are agreeing to our
        <HoppSmartAnchor
          class="link"
          :to="tosLink"
          blank
          label="Terms of Service"
        />
        and
        <HoppSmartAnchor
          class="link"
          :to="privacyPolicyLink"
          blank
          label="Privacy Policy"
        />
      </div>
      <div v-if="mode === 'email'">
        <HoppButtonSecondary
          :label="t('auth.all_sign_in_options')"
          :icon="IconArrowLeft"
          class="!p-0"
          @click="mode = 'sign-in'"
        />
      </div>
      <div
        v-if="mode === 'email-sent'"
        class="flex justify-between flex-1 text-secondaryLight"
      >
        <HoppSmartAnchor
          class="link"
          :label="t('auth.re_enter_email')"
          :icon="IconArrowLeft"
          @click="mode = 'email'"
        />
        <HoppSmartAnchor
          class="link"
          :label="`${t('action.dismiss')}`"
          @click="hideModal"
        />
      </div>
    </template>
  </HoppSmartModal>
</template>

<script lang="ts">
import { defineComponent, computed } from "vue"
import { platform } from "~/platform"
import IconGithub from "~icons/auth/github"
import IconGoogle from "~icons/auth/google"
import IconEmail from "~icons/auth/email"
import IconMicrosoft from "~icons/auth/microsoft"
import IconArrowLeft from "~icons/lucide/arrow-left"
import { setLocalConfig } from "~/newstore/localpersistence"
import { useStreamSubscriber } from "@composables/stream"
import { useToast } from "@composables/toast"
import { useI18n } from "@composables/i18n"
import { LoginItemDef } from "~/platform/auth"

export default defineComponent({
  props: {
    show: Boolean,
  },
  emits: ["hide-modal"],
  setup() {
    const { subscribeToStream } = useStreamSubscriber()

    const tosLink = import.meta.env.VITE_APP_TOS_LINK
    const privacyPolicyLink = import.meta.env.VITE_APP_PRIVACY_POLICY_LINK

    return {
      subscribeToStream,
      t: useI18n(),
      additonalLoginItems: computed(
        () => platform.auth.additionalLoginItems ?? []
      ),
      toast: useToast(),
      IconGithub,
      IconGoogle,
      IconEmail,
      IconMicrosoft,
      IconArrowLeft,
      tosLink,
      privacyPolicyLink,
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
    const currentUser$ = platform.auth.getCurrentUserStream()

    this.subscribeToStream(currentUser$, (user) => {
      if (user) this.hideModal()
    })
  },
  methods: {
    async doAdditionalLoginItemClickAction(item: LoginItemDef) {
      await item.onClick()
      this.$emit("hide-modal")
    },
    showLoginSuccess() {
      this.toast.success(`${this.t("auth.login_success")}`)
    },
    async signInWithGoogle() {
      this.signingInWithGoogle = true

      try {
        await platform.auth.signInUserWithGoogle()
      } catch (e) {
        console.error(e)
        /*
        A auth/account-exists-with-different-credential Firebase error wont happen between Google and any other providers
        Seems Google account overwrites accounts of other providers https://github.com/firebase/firebase-android-sdk/issues/25
        */
        this.toast.error(`${this.t("error.something_went_wrong")}`)
      }

      this.signingInWithGoogle = false
    },
    async signInWithGithub() {
      this.signingInWithGitHub = true

      const result = await platform.auth.signInUserWithGithub()

      if (!result) {
        this.signingInWithGitHub = false
        return
      }

      if (result.type === "success") {
        // this.showLoginSuccess()
      } else if (result.type === "account-exists-with-different-cred") {
        this.toast.info(`${this.t("auth.account_exists")}`, {
          duration: 0,
          closeOnSwipe: false,
          action: {
            text: `${this.t("action.yes")}`,
            onClick: async (_, toastObject) => {
              await result.link()
              this.showLoginSuccess()

              toastObject.goAway(0)
            },
          },
        })
      } else {
        console.log("error logging into github", result.err)
        this.toast.error(`${this.t("error.something_went_wrong")}`)
      }

      this.signingInWithGitHub = false
    },
    async signInWithMicrosoft() {
      this.signingInWithMicrosoft = true

      try {
        await platform.auth.signInUserWithMicrosoft()
        // this.showLoginSuccess()
      } catch (e) {
        console.error(e)
        /*
        A auth/account-exists-with-different-credential Firebase error wont happen between MS with Google or Github
        If a Github account exists and user then logs in with MS email we get a "Something went wrong toast" and console errors and MS replaces GH as only provider.
        The error messages are as follows:
            FirebaseError: Firebase: Error (auth/popup-closed-by-user).
            @firebase/auth: Auth (9.6.11): INTERNAL ASSERTION FAILED: Pending promise was never set
        They may be related to https://github.com/firebase/firebaseui-web/issues/947
        */
        this.toast.error(`${this.t("error.something_went_wrong")}`)
      }

      this.signingInWithMicrosoft = false
    },
    async signInWithEmail() {
      this.signingInWithEmail = true

      await platform.auth
        .signInWithEmail(this.form.email)
        .then(() => {
          this.mode = "email-sent"
          setLocalConfig("emailForSignIn", this.form.email)
        })
        .catch((e) => {
          console.error(e)
          this.toast.error(e.message)
          this.signingInWithEmail = false
        })
        .finally(() => {
          this.signingInWithEmail = false
        })
    },
    hideModal() {
      this.mode = "sign-in"
      this.toast.clear()
      this.$emit("hide-modal")
    },
  },
})
</script>
