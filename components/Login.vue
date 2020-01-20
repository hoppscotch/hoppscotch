<template>
  <div>
    <button @click.prevent="signInWithGoogle">Log in with Google</button>
    <button @click.prevent="signInWithGithub">Log in with GitHub</button>
  </div>
</template>

<script>
import firebase from "firebase/app";
import "firebase/auth";

export default {
  methods: {
    signInWithGoogle() {
      var provider = new firebase.auth.GoogleAuthProvider();
      firebase
        .auth()
        .signInWithPopup(provider)
        .catch(err => alert(err.message || err));
    },
    signInWithGithub() {
      var provider = new firebase.auth.GithubAuthProvider();
      firebase
        .auth()
        .signInWithPopup(provider)
        .catch(err => alert(err.message || err));
    }
  }
};
</script>
