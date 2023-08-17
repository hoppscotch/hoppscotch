<template>
  <div v-if="nonAdminUser" class="text-center">
    {{ t('state.non_admin_logged_in') }}
    <span @click="logout()" class="text-red-500 cursor-pointer underline">{{
      t('state.sign_out')
    }}</span>
    {{ t('state.login_as_admin') }}
  </div>
  <div v-else class="flex flex-1 flex-col">
    <div
      class="p-6 bg-primaryLight rounded-lg border border-primaryDark shadow"
    >
      <div
        v-if="mode === 'sign-in' && allowedAuthProviders"
        class="flex flex-col space-y-2"
      >
        <HoppSmartItem
          v-if="allowedAuthProviders.includes('GITHUB')"
          :loading="signingInWithGitHub"
          :icon="IconGithub"
          :label="t('state.continue_github')"
          class="!items-center"
          @click="signInWithGithub"
        />
        <HoppSmartItem
          v-if="allowedAuthProviders.includes('GOOGLE')"
          :loading="signingInWithGoogle"
          :icon="IconGoogle"
          :label="t('state.continue_google')"
          @click="signInWithGoogle"
        />
        <HoppSmartItem
          v-if="allowedAuthProviders.includes('MICROSOFT')"
          :loading="signingInWithMicrosoft"
          :icon="IconMicrosoft"
          :label="t('state.continue_microsoft')"
          @click="signInWithMicrosoft"
        />
        <HoppSmartItem
          v-if="allowedAuthProviders.includes('EMAIL')"
          :icon="IconEmail"
          :label="t('state.continue_email')"
          @click="mode = 'email'"
        />
      </div>
      <form
        v-if="mode === 'email' && allowedAuthProviders"
        class="flex flex-col space-y-4"
        @submit.prevent="signInWithEmail"
      >
        <HoppSmartInput
          v-model="form.email"
          type="email"
          placeholder=" "
          input-styles="floating-input"
          label="Email"
        />

        <HoppButtonPrimary
          :loading="signingInWithEmail"
          type="submit"
          :label="t('state.send_magic_link')"
        />
      </form>
      <div v-if="!allowedAuthProviders">
        <p>{{ t('state.require_auth_provider') }}</p>
        <p>{{ t('state.configure_auth') }}</p>
        <div class="mt-5">
          <a
            href="https://docs.hoppscotch.io/documentation/self-host/getting-started"
          >
            <HoppButtonSecondary
              outline
              filled
              blank
              :icon="IconFileText"
              :label="t('state.self_host_docs')"
            />
          </a>
        </div>
      </div>
      <div v-if="mode === 'email-sent'" class="flex flex-col px-4">
        <div class="flex flex-col items-center justify-center max-w-md">
          <icon-lucide-inbox class="w-6 h-6 text-accent" />
          <h3 class="my-2 text-lg text-center">
            {{ t('state.magic_link_success') }} {{ form.email }}
          </h3>
          <p class="text-center">
            {{ t('state.magic_link_success') }} {{ form.email }}.
            {{ t('state.magic_link_sign_in') }}
          </p>
        </div>
      </div>
    </div>

    <section class="mt-15">
      <div
        v-if="
          mode === 'sign-in' &&
          tosLink &&
          privacyPolicyLink &&
          allowedAuthProviders
        "
        class="text-secondaryLight text-tiny"
      >
        {{ t('state.sign_in_agreement') }}
        <HoppSmartAnchor
          class="link"
          :to="tosLink"
          blank
          label="Terms of Service"
        />
        {{ t('state.and') }}
        <HoppSmartAnchor
          class="link"
          :to="privacyPolicyLink"
          blank
          :label="t('state.privacy_policy')"
        />
      </div>
      <div v-if="mode === 'email'">
        <HoppButtonSecondary
          :label="t('state.sign_in_options')"
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
          :label="t('state.reenter_email')"
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
import IconFileText from '~icons/lucide/file-text';
import { setLocalConfig } from '~/helpers/localpersistence';
import { useStreamSubscriber } from '~/composables/stream';
import { useToast } from '~/composables/toast';
import { auth } from '~/helpers/auth';
import { HoppButtonPrimary, HoppButtonSecondary } from '@hoppscotch/ui';
import { useI18n } from '~/composables/i18n';

const { subscribeToStream } = useStreamSubscriber();

const t = useI18n();
const toast = useToast();

const tosLink = import.meta.env.VITE_APP_TOS_LINK;
const privacyPolicyLink = import.meta.env.VITE_APP_PRIVACY_POLICY_LINK;
const allowedAuthProviders = import.meta.env.VITE_ALLOWED_AUTH_PROVIDERS;

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
