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
    <div slot="body" class="flex flex-col">
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
    <div slot="footer">
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
import { fb } from "~/helpers/fb"

export default {
  props: {
    show: Boolean,
  },
  data() {
    return {
      fb,
      form: {
        email: "",
      },
      signingInWithEmail: false,
      emailRegex:
        /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/,
    }
  },
  mounted() {
    this.$subscribeTo(fb.currentUser$, (user) => {
      if (user) this.hideModal()
    })

    this._keyListener = function (e) {
      if (e.key === "Escape") {
        e.preventDefault()
        this.hideModal()
      }
    }
    document.addEventListener("keydown", this._keyListener.bind(this))
  },
  beforeDestroy() {
    document.removeEventListener("keydown", this._keyListener)
  },
  methods: {
    async signInWithEmail() {
      this.signingInWithEmail = true
      const actionCodeSettings = {
        url: `${process.env.BASE_URL}/enter`,
        handleCodeInApp: true,
      }
      await fb
        .signInWithEmail(this.form.email, actionCodeSettings)
        .then(() => {
          this.$toast.success("Check your inbox", {
            icon: "person",
          })
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
      this.$emit("hide-modal")
    },
  },
}
</script>
