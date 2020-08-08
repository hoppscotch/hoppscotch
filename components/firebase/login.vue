<template>
  <div>
    <div>
      <button class="icon" @click="signInWithGoogle" v-close-popover>
        <icon :icon="'google'" />
        <span>Google</span>
      </button>
    </div>
    <div>
      <button class="icon" @click="signInWithGithub" v-close-popover>
        <icon :icon="'github'" />
        <span>GitHub</span>
      </button>
    </div>
  </div>
</template>

<script>
import firebase from "firebase/app"
import { fb } from "~/helpers/fb"

export default {
  data() {
    return {
      fb,
    }
  },
  methods: {
    showLoginSuccess() {
      this.$toast.info(this.$t("login_success"), {
        icon: "vpn_key",
      })
    },
    signInWithGoogle() {
      const provider = new firebase.auth.GoogleAuthProvider()
      const self = this
      firebase
        .auth()
        .signInWithPopup(provider)
        .then(({ additionalUserInfo }) => {
          if (additionalUserInfo.isNewUser) {
            self.$toast.info(`${self.$t("turn_on")} ${self.$t("sync")}`, {
              icon: "sync",
              duration: null,
              closeOnSwipe: false,
              action: {
                text: self.$t("yes"),
                onClick: (e, toastObject) => {
                  fb.writeSettings("syncHistory", true)
                  fb.writeSettings("syncCollections", true)
                  fb.writeSettings("syncEnvironments", true)
                  self.$router.push({ path: "/settings" })
                  toastObject.remove()
                },
              },
            })
          }
          self.showLoginSuccess()
        })
        .catch((err) => {
          // An error happened.
          if (err.code === "auth/account-exists-with-different-credential") {
            // Step 2.
            // User's email already exists.
            // The pending Google credential.
            const pendingCred = err.credential
            // The provider account's email address.
            const email = err.email
            // Get sign-in methods for this email.
            firebase
              .auth()
              .fetchSignInMethodsForEmail(email)
              .then((methods) => {
                // Step 3.
                // If the user has several sign-in methods,
                // the first method in the list will be the "recommended" method to use.
                if (methods[0] === "password") {
                  // Asks the user their password.
                  // In real scenario, you should handle this asynchronously.
                  const password = promptUserForPassword() // TODO: implement promptUserForPassword.
                  auth
                    .signInWithEmailAndPassword(email, password)
                    .then((
                      user // Step 4a.
                    ) => user.linkWithCredential(pendingCred))
                    .then(() => {
                      // Google account successfully linked to the existing Firebase user.
                      self.showLoginSuccess()
                    })
                  return
                }

                self.$toast.info(`${self.$t("login_with")}`, {
                  icon: "vpn_key",
                  duration: null,
                  closeOnSwipe: false,
                  action: {
                    text: self.$t("yes"),
                    onClick: (e, toastObject) => {
                      // All the other cases are external providers.
                      // Construct provider object for that provider.
                      // TODO: implement getProviderForProviderId.
                      const provider = new firebase.auth.GithubAuthProvider()
                      // At this point, you should let the user know that they already has an account
                      // but with a different provider, and let them validate the fact they want to
                      // sign in with this provider.
                      // Sign in to provider. Note: browsers usually block popup triggered asynchronously,
                      // so in real scenario you should ask the user to click on a "continue" button
                      // that will trigger the signInWithPopup.
                      firebase
                        .auth()
                        .signInWithPopup(provider)
                        .then(({ user }) => {
                          // Remember that the user may have signed in with an account that has a different email
                          // address than the first one. This can happen as Firebase doesn't control the provider's
                          // sign in flow and the user is free to login using whichever account they own.
                          // Step 4b.
                          // Link to Google credential.
                          // As we have access to the pending credential, we can directly call the link method.
                          user.linkAndRetrieveDataWithCredential(pendingCred).then((usercred) => {
                            // Google account successfully linked to the existing Firebase user.
                            self.showLoginSuccess()
                          })
                        })

                      toastObject.remove()
                    },
                  },
                })
              })
          }
        })
    },
    signInWithGithub() {
      const provider = new firebase.auth.GithubAuthProvider()
      const self = this
      firebase
        .auth()
        .signInWithPopup(provider)
        .then(({ additionalUserInfo }) => {
          if (additionalUserInfo.isNewUser) {
            self.$toast.info(`${self.$t("turn_on")} ${self.$t("sync")}`, {
              icon: "sync",
              duration: null,
              closeOnSwipe: false,
              action: {
                text: self.$t("yes"),
                onClick: (e, toastObject) => {
                  fb.writeSettings("syncHistory", true)
                  fb.writeSettings("syncCollections", true)
                  fb.writeSettings("syncEnvironments", true)
                  self.$router.push({ path: "/settings" })
                  toastObject.remove()
                },
              },
            })
          }
          self.showLoginSuccess()
        })
        .catch((err) => {
          // An error happened.
          if (err.code === "auth/account-exists-with-different-credential") {
            // Step 2.
            // User's email already exists.
            // The pending Google credential.
            const pendingCred = err.credential
            // The provider account's email address.
            const email = err.email
            // Get sign-in methods for this email.
            firebase
              .auth()
              .fetchSignInMethodsForEmail(email)
              .then((methods) => {
                // Step 3.
                // If the user has several sign-in methods,
                // the first method in the list will be the "recommended" method to use.
                if (methods[0] === "password") {
                  // Asks the user their password.
                  // In real scenario, you should handle this asynchronously.
                  const password = promptUserForPassword() // TODO: implement promptUserForPassword.
                  firebase
                    .auth()
                    .signInWithEmailAndPassword(email, password)
                    .then((
                      user // Step 4a.
                    ) => user.linkWithCredential(pendingCred))
                    .then(() => {
                      // Google account successfully linked to the existing Firebase user.
                      self.showLoginSuccess()
                    })
                  return
                }

                self.$toast.info(`${self.$t("login_with")}`, {
                  icon: "vpn_key",
                  duration: null,
                  closeOnSwipe: false,
                  action: {
                    text: self.$t("yes"),
                    onClick: (e, toastObject) => {
                      // All the other cases are external providers.
                      // Construct provider object for that provider.
                      // TODO: implement getProviderForProviderId.
                      const provider = new firebase.auth.GoogleAuthProvider()
                      // At this point, you should let the user know that they already has an account
                      // but with a different provider, and let them validate the fact they want to
                      // sign in with this provider.
                      // Sign in to provider. Note: browsers usually block popup triggered asynchronously,
                      // so in real scenario you should ask the user to click on a "continue" button
                      // that will trigger the signInWithPopup.
                      firebase
                        .auth()
                        .signInWithPopup(provider)
                        .then(({ user }) => {
                          // Remember that the user may have signed in with an account that has a different email
                          // address than the first one. This can happen as Firebase doesn't control the provider's
                          // sign in flow and the user is free to login using whichever account they own.
                          // Step 4b.
                          // Link to Google credential.
                          // As we have access to the pending credential, we can directly call the link method.
                          user.linkAndRetrieveDataWithCredential(pendingCred).then((usercred) => {
                            self.showLoginSuccess()
                          })
                        })

                      toastObject.remove()
                    },
                  },
                })
              })
          }
        })
    },
  },
}
</script>
