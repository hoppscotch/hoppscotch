import { BehaviorSubject, Subject } from 'rxjs';
import {
  getLocalConfig,
  removeLocalConfig,
  setLocalConfig,
} from './localpersistence';
import { Ref, ref } from 'vue';
import * as O from 'fp-ts/Option';
import authQuery from './backend/rest/authQuery';

/**
 * A common (and required) set of fields that describe a user.
 */
export type HoppUser = {
  /** A unique ID identifying the user */
  uid: string;

  /** The name to be displayed as the user's */
  displayName: string | null;

  /** The user's email address */
  email: string | null;

  /** URL to the profile picture of the user */
  photoURL: string | null;

  /** Name of the provider authenticating (NOTE: See notes on `platform/auth.ts`) */
  provider?: string;
  /** Access Token for the auth of the user against the given `provider`. */
  accessToken?: string;
  emailVerified: boolean;
  /** Flag to check for admin status */
  isAdmin: boolean;
};

export type AuthEvent =
  | { event: 'probable_login'; user: HoppUser } // We have previous login state, but the app is waiting for authentication
  | { event: 'login'; user: HoppUser } // We are authenticated
  | { event: 'logout' } // No authentication and we have no previous state
  | { event: 'token_refresh' }; // We have previous login state, but the app is waiting for authentication

export type GithubSignInResult =
  | { type: 'success'; user: HoppUser } // The authentication was a success
  | { type: 'account-exists-with-different-cred'; link: () => Promise<void> } // We authenticated correctly, but the provider didn't match, so we give the user the opportunity to link to continue completing auth
  | { type: 'error'; err: unknown }; // Auth failed completely and we don't know why

export const authEvents$ = new Subject<
  AuthEvent | { event: 'token_refresh' }
>();

const currentUser$ = new BehaviorSubject<HoppUser | null>(null);
export const probableUser$ = new BehaviorSubject<HoppUser | null>(null);

const logout = async () => {
  await authQuery.logout();
};

const signOut = async (reloadWindow = false) => {
  await logout();

  // Reload the window if both `access_token` and `refresh_token`is invalid
  // there by the user is taken to the login page
  if (reloadWindow) {
    window.location.reload();
  }

  probableUser$.next(null);
  currentUser$.next(null);
  removeLocalConfig('login_state');

  authEvents$.next({
    event: 'logout',
  });
};

const signInUserWithGithubFB = async () => {
  window.location.href = `${
    import.meta.env.VITE_BACKEND_API_URL
  }/auth/github?redirect_uri=${import.meta.env.VITE_ADMIN_URL}`;
};

const signInUserWithGoogleFB = async () => {
  window.location.href = `${
    import.meta.env.VITE_BACKEND_API_URL
  }/auth/google?redirect_uri=${import.meta.env.VITE_ADMIN_URL}`;
};

const signInUserWithMicrosoftFB = async () => {
  window.location.href = `${
    import.meta.env.VITE_BACKEND_API_URL
  }/auth/microsoft?redirect_uri=${import.meta.env.VITE_ADMIN_URL}`;
};

const getInitialUserDetails = async () =>
  (await authQuery.getUserDetails()).data;

const isGettingInitialUser: Ref<null | boolean> = ref(null);

const setUser = (user: HoppUser | null) => {
  currentUser$.next(user);
  probableUser$.next(user);
  setLocalConfig('login_state', JSON.stringify(user));
};

const setInitialUser = async () => {
  isGettingInitialUser.value = true;
  const res = await getInitialUserDetails();

  if (res.errors && res.errors[0]) {
    const error = res.errors[0];

    if (error.message === 'auth/cookies_not_found') {
      setUser(null);
    } else if (error.message === 'Unauthorized') {
      const isRefreshSuccess = await refreshToken();

      if (isRefreshSuccess) {
        setInitialUser();
      } else {
        setUser(null);
        await signOut(true);
      }
    }
  } else if (res.data?.me) {
    const hoppBackendUser = res.data.me;

    const hoppUser: HoppUser = {
      uid: hoppBackendUser.uid,
      displayName: hoppBackendUser.displayName,
      email: hoppBackendUser.email,
      photoURL: hoppBackendUser.photoURL,
      emailVerified: true,
      isAdmin: hoppBackendUser.isAdmin,
    };

    if (!hoppUser.isAdmin) {
      hoppUser.isAdmin = await elevateUser();
    }

    setUser(hoppUser);

    authEvents$.next({
      event: 'login',
      user: hoppUser,
    });
  }

  isGettingInitialUser.value = false;
};

const refreshToken = async () => {
  try {
    const res = await authQuery.refreshToken();
    authEvents$.next({
      event: 'token_refresh',
    });
    return res.status === 200;
  } catch {
    return false;
  }
};

const elevateUser = async () => !!(await authQuery.elevateUser()).data?.isAdmin;

async function sendMagicLink(email: string) {
  const res = await authQuery.sendMagicLink(email);
  if (res.data && res.data.deviceIdentifier) {
    setLocalConfig('deviceIdentifier', res.data.deviceIdentifier);
  } else {
    throw new Error('test: does not get device identifier');
  }
  return res.data;
}

export const auth = {
  getCurrentUserStream: () => currentUser$,
  getAuthEventsStream: () => authEvents$,
  getProbableUserStream: () => probableUser$,

  getCurrentUser: () => currentUser$.value,
  getProbableUser: () => probableUser$.value,

  performAuthInit: async () => {
    const probableUser = JSON.parse(getLocalConfig('login_state') ?? 'null');
    probableUser$.next(probableUser);
    await setInitialUser();
  },

  signInWithEmail: async (email: string) => {
    await sendMagicLink(email);
  },

  isSignInWithEmailLink: (url: string) => {
    const urlObject = new URL(url);
    const searchParams = new URLSearchParams(urlObject.search);

    return !!searchParams.get('token');
  },

  signInUserWithGoogle: async () => {
    await signInUserWithGoogleFB();
  },

  signInUserWithGithub: async () => {
    await signInUserWithGithubFB();
    return undefined;
  },

  signInUserWithMicrosoft: async () => {
    await signInUserWithMicrosoftFB();
  },

  signInWithEmailLink: async (email: string, url: string) => {
    const urlObject = new URL(url);
    const searchParams = new URLSearchParams(urlObject.search);

    const token = searchParams.get('token');
    const deviceIdentifier = getLocalConfig('deviceIdentifier');

    await authQuery.signInWithEmailLink(token, deviceIdentifier);
  },

  performAuthRefresh: async () => {
    const isRefreshSuccess = await refreshToken();

    if (isRefreshSuccess) {
      setInitialUser();
      return O.some(true);
    } else {
      setUser(null);
      isGettingInitialUser.value = false;
      return O.none;
    }
  },

  signOutUser: async (reloadWindow = false) => {
    await signOut(reloadWindow);
  },

  processMagicLink: async () => {
    if (auth.isSignInWithEmailLink(window.location.href)) {
      const deviceIdentifier = getLocalConfig('deviceIdentifier');

      if (!deviceIdentifier) {
        throw new Error(
          'Device Identifier not found, you can only signin from the browser you generated the magic link'
        );
      }

      await auth.signInWithEmailLink(deviceIdentifier, window.location.href);

      removeLocalConfig('deviceIdentifier');
      window.location.href = import.meta.env.VITE_ADMIN_URL;
    }
  },
};
