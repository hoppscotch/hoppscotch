<template>
  <SmartModal v-if="show" @close="hideModal">
    <template #header>
      <h3 class="heading">{{ $t("login_with") }} {{ $t("email") }}</h3>
      <ButtonSecondary icon="close" @click.native="hideModal" />
    </template>
    <template v-if="mode === 'sign-in'" #body>
      <label for="email"> E-mail </label>
      <input
        id="email"
        v-model="form.email"
        class="input"
        type="email"
        name="email"
        placeholder="you@mail.com"
        autocomplete="email"
        required
        spellcheck="false"
        autofocus
        @keyup.enter="signInWithEmail"
      />
    </template>
    <template v-else #body>
      <div class="flex flex-col items-center">
        <div class="flex justify-center max-w-md p-4 items-center flex-col">
          <i class="material-icons text-accent" style="font-size: 64px">
            verified
          </i>
          <h3 class="font-bold my-2 text-center text-lg">
            {{ $t("we_sent_magic_link") }}
          </h3>
          <p class="text-center">
            {{ $t("we_sent_magic_link_description", { email: form.email }) }}
          </p>
          <p class="info">{{ $t("check_your_inbox") }}</p>
        </div>
      </div>
    </template>
    <template v-if="mode === 'sign-in'" #footer>
      <span></span>
      <span>
        <ButtonSPrimary
          :loading="signingInWithEmail"
          class="rounded-md button"
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
      /></span>
    </template>
  </SmartModal>
</template>

<script>
import { currentUser$, signInWithEmail } from "~/helpers/fb/auth"
import { setLocalConfig } from "~/newstore/localpersistence"

export default {
  props: {
    show: Boolean,
  },
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
    async signInWithEmail() {
      this.signingInWithEmail = true
      const actionCodeSettings = {
        url: `${process.env.BASE_URL}/enter`,
        handleCodeInApp: true,
      }
      await signInWithEmail(this.form.email, actionCodeSettings)
        .then(() => {
          this.mode = "email"
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
