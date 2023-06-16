<template>
  <div v-if="nonAdminUser" class="text-center">
    Logged in as non admin user. Please
    <span @click="logout()" class="text-red-500 cursor-pointer underline"
      >sign out</span
    >
    and login with an admin account.
  </div>
  <div v-else class="flex flex-1 flex-col">
    <div
      class="p-6 bg-primaryLight rounded-lg border border-primaryDark shadow"
    >
      <div v-if="mode === 'sign-in'" class="flex flex-col space-y-2">
        <HoppSmartItem
          :loading="signingInWithGitHub"
          :icon="IconGithub"
          :label="`Continue with GitHub`"
          class="!items-center"
          @click="signInWithGithub"
        />
        <HoppSmartItem
          :loading="signingInWithGoogle"
          :icon="IconGoogle"
          :label="`Continue with Google`"
          @click="signInWithGoogle"
        />
        <HoppSmartItem
          :loading="signingInWithMicrosoft"
          :icon="IconMicrosoft"
          :label="`Continue with Microsoft`"
          @click="signInWithMicrosoft"
        />
        <HoppSmartItem
          :icon="IconEmail"
          :label="`Continue with Email`"
          @click="mode = 'email'"
        />
      </div>
      <form
        v-if="mode === 'email'"
        class="flex flex-col space-y-4"
        @submit.prevent="signInWithEmail"
      >
        <div class="flex flex-col">
          <input
            id="email"
            v-model="form.email"
            class="input floating-input"
            placeholder=" "
            type="email"
            name="email"
            autocomplete="off"
            required
            spellcheck="false"
            v-focus
            autofocus
          />
          <label for="email"> Email </label>
        </div>
        <HoppButtonPrimary
          :loading="signingInWithEmail"
          type="submit"
          :label="`Send magic link`"
        />
      </form>
      <div v-if="mode === 'email-sent'" class="flex flex-col px-4">
        <div class="flex flex-col items-center justify-center max-w-md">
          <icon-lucide-inbox class="w-6 h-6 text-accent" />
          <h3 class="my-2 text-lg text-center">
            We sent a magic link to {{ form.email }}
          </h3>
          <p class="text-center">
            We sent a magic link to {{ form.email }}. Click on the link to sign
            in.
          </p>
        </div>
      </div>
    </div>

    <section class="mt-15">
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
          :label="'All sign in option'"
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
          :label="'Re enter email'"
          :icon="IconArrowLeft"
          @click="mode = 'email'"
        />
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import IconGithub from '~icons/auth/github';
import IconGoogle from '~icons/auth/google';
import IconEmail from '~icons/auth/email';
import IconMicrosoft from '~icons/auth/microsoft';
import IconArrowLeft from '~icons/lucide/arrow-left';
import { setLocalConfig } from '~/helpers/localpersistence';
import { useStreamSubscriber } from '~/composables/stream';
import { useToast } from '~/composables/toast';
import { auth } from '~/helpers/auth';
import { useI18n } from '~/composables/i18n';

const t = useI18n();

const { subscribeToStream } = useStreamSubscriber();

const toast = useToast();

const tosLink = import.meta.env.VITE_APP_TOS_LINK;
const privacyPolicyLink = import.meta.env.VITE_APP_PRIVACY_POLICY_LINK;

// DATA

const form = ref({
  email: '',
});
const signingInWithGoogle = ref(false);
const signingInWithGitHub = ref(false);
const signingInWithMicrosoft = ref(false);
const signingInWithEmail = ref(false);
const mode = ref('sign-in');

const nonAdminUser = ref(false);

onMounted(() => {
  const currentUser$ = auth.getCurrentUserStream();

  subscribeToStream(currentUser$, (user) => {
    if (user && !user.isAdmin) {
      nonAdminUser.value = true;
      toast.error(`${t('state.non_admin_login')}`);
    }
  });
});

async function signInWithGoogle() {
  signingInWithGoogle.value = true;

  try {
    await auth.signInUserWithGoogle();
  } catch (e) {
    console.error(e);
    /*
    A auth/account-exists-with-different-credential Firebase error wont happen between Google and any other providers
    Seems Google account overwrites accounts of other providers https://github.com/firebase/firebase-android-sdk/issues/25
    */
    toast.error(`${t('state.google_signin_failure')}`);
  }

  signingInWithGoogle.value = false;
}
async function signInWithGithub() {
  signingInWithGitHub.value = true;

  try {
    await auth.signInUserWithGithub();
  } catch (e) {
    console.error(e);
    /*
    A auth/account-exists-with-different-credential Firebase error wont happen between Google and any other providers
    Seems Google account overwrites accounts of other providers https://github.com/firebase/firebase-android-sdk/issues/25
    */
    toast.error(`${t('state.github_signin_failure')}`);
  }

  signingInWithGitHub.value = false;
}

async function signInWithMicrosoft() {
  signingInWithMicrosoft.value = true;

  try {
    await auth.signInUserWithMicrosoft();
  } catch (e) {
    console.error(e);
    /*
    A auth/account-exists-with-different-credential Firebase error wont happen between MS with Google or Github
    If a Github account exists and user then logs in with MS email we get a "Something went wrong toast" and console errors and MS replaces GH as only provider.
    The error messages are as follows:
        FirebaseError: Firebase: Error (auth/popup-closed-by-user).
        @firebase/auth: Auth (9.6.11): INTERNAL ASSERTION FAILED: Pending promise was never set
    They may be related to https://github.com/firebase/firebaseui-web/issues/947
    */
    toast.error(`${t('state.error')}`);
  }

  signingInWithMicrosoft.value = false;
}
async function signInWithEmail() {
  signingInWithEmail.value = true;

  await auth
    .signInWithEmail(form.value.email)
    .then(() => {
      mode.value = 'email-sent';
      setLocalConfig('emailForSignIn', form.value.email);
    })
    .catch((e: any) => {
      console.error(e);
      toast.error(e.message);
      signingInWithEmail.value = false;
    })
    .finally(() => {
      signingInWithEmail.value = false;
    });
}

const logout = async () => {
  try {
    await auth.signOutUser();
    window.location.reload();
    toast.success(`${t('state.logged_out')}`);
  } catch (e) {
    console.error(e);
    toast.error(`${t('state.error')}`);
  }
};
</script>
