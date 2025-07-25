<template>
  <div v-if="nonAdminUser" class="text-center">
    {{ t('state.non_admin_logged_in') }}
    <span @click="logout()" class="text-red-500 cursor-pointer underline">{{
      t('state.sign_out')
    }}</span>
    {{ t('state.login_as_admin') }}
  </div>

  <div v-else-if="fetching" class="flex justify-center py-6">
    <HoppSmartSpinner />
  </div>

  <div v-else-if="error">
    <p class="text-xl">{{ t('state.error') }}</p>
  </div>

  <div v-else class="flex flex-1 flex-col">
    <div
      class="p-4 bg-primaryLight rounded-lg border border-primaryDark shadow"
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
      <div
        v-if="!allowedAuthProviders?.length"
        class="flex flex-col items-center text-center"
      >
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

    <div v-if="canReRunOnboarding" class="mt-4">
      <span class="text-tiny"> Need to re-configure auth providers? </span>
      <HoppSmartAnchor
        class="link text-tiny"
        :to="`/onboarding`"
        label="Setup Authentication"
      />
    </div>

    <section class="mt-8">
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
import { computedAsync } from '@vueuse/core';
import { onMounted, ref } from 'vue';
import { useI18n } from '~/composables/i18n';
import { useToast } from '~/composables/toast';
import { auth } from '~/helpers/auth';
import { setLocalConfig } from '~/helpers/localpersistence';
import IconEmail from '~icons/auth/email';
import IconGithub from '~icons/auth/github';
import IconGoogle from '~icons/auth/google';
import IconMicrosoft from '~icons/auth/microsoft';
import IconArrowLeft from '~icons/lucide/arrow-left';
import IconFileText from '~icons/lucide/file-text';

const t = useI18n();
const toast = useToast();

const tosLink = import.meta.env.VITE_APP_TOS_LINK;
const privacyPolicyLink = import.meta.env.VITE_APP_PRIVACY_POLICY_LINK;

const form = ref({
  email: '',
});
const fetching = ref(false);
const error = ref(false);
const signingInWithGoogle = ref(false);
const signingInWithGitHub = ref(false);
const signingInWithMicrosoft = ref(false);
const signingInWithEmail = ref(false);
const mode = ref('sign-in');
const nonAdminUser = ref(false);

const allowedAuthProviders = ref<string[]>([]);

// check if the user can re-run onboarding
const canReRunOnboarding = computedAsync(async () => {
  const onboardingStatus = await auth.getOnboardingStatus();

  return (
    onboardingStatus?.onboardingCompleted && onboardingStatus.canReRunOnboarding
  );
});

onMounted(async () => {
  const user = auth.getCurrentUser();
  if (user && !user.isAdmin) {
    nonAdminUser.value = true;
  }
  allowedAuthProviders.value = await getAllowedAuthProviders();
});

const signInWithGoogle = () => {
  signingInWithGoogle.value = true;

  try {
    auth.signInUserWithGoogle();
  } catch (e) {
    console.error(e);
    toast.error(t('state.google_signin_failure'));
  }

  signingInWithGoogle.value = false;
};

const signInWithGithub = () => {
  signingInWithGitHub.value = true;

  try {
    auth.signInUserWithGithub();
  } catch (e) {
    console.error(e);
    toast.error(t('state.github_signin_failure'));
  }

  signingInWithGitHub.value = false;
};

const signInWithMicrosoft = () => {
  signingInWithMicrosoft.value = true;

  try {
    auth.signInUserWithMicrosoft();
  } catch (e) {
    console.error(e);
    toast.error(t('state.microsoft_signin_failure'));
  }

  signingInWithMicrosoft.value = false;
};

const signInWithEmail = async () => {
  signingInWithEmail.value = true;
  try {
    await auth.signInWithEmail(form.value.email);
    mode.value = 'email-sent';
    setLocalConfig('emailForSignIn', form.value.email);
  } catch (e) {
    console.error(e);
    toast.error(t('state.email_signin_failure'));
  }
  signingInWithEmail.value = false;
};

const getAllowedAuthProviders = async () => {
  fetching.value = true;
  try {
    const res = await auth.getAllowedAuthProviders();
    return res;
  } catch (e) {
    error.value = true;
    toast.error(t('state.error_auth_providers'));
  } finally {
    fetching.value = false;
  }
};

const logout = async () => {
  try {
    await auth.signOutUser();
    window.location.reload();
    toast.success(t('state.logged_out'));
  } catch (e) {
    console.error(e);
    toast.error(t('state.error'));
  }
};
</script>
