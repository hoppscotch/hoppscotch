<template>
  <SmartModal v-if="show" @close="hideModal">
    <div slot="header">
      <div class="row-wrapper">
        <h3 class="title">{{ $t("login_with") }} {{ $t("email") }}</h3>
        <div>
          <button class="icon" @click="hideModal">
            <i class="material-icons">close</i>
          </button>
        </div>
      </div>
    </div>
    <div v-if="mode === 'sign-in'" slot="body" class="flex flex-col">
      <label for="email"> E-mail </label>
      <input
        id="email"
        v-model="form.email"
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
    <div v-else slot="body" class="flex flex-col items-center">
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
    <div v-if="mode === 'sign-in'" slot="footer">
      <div class="row-wrapper">
        <span></span>
        <span>
          <button v-if="signingInWithEmail" class="icon" type="button">
            {{ $t("loading") }}
          </button>
          <button
            v-else
            class="rounded-md"
            :disabled="
              form.email.length !== 0
                ? emailRegex.test(form.email)
                  ? false
                  : true
                : true
            "
            type="button"
            tabindex="-1"
            @click="signInWithEmail"
          >
            {{ $t("send_magic_link") }}
          </button>
        </span>
      </div>
    </div>
  </SmartModal>
</template>

<script>
import { currentUser$, signInWithEmail } from "~/helpers/fb/auth"

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
          window.localStorage.setItem("emailForSignIn", this.form.email)
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
