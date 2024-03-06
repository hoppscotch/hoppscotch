import { BehaviorSubject, Subject } from 'rxjs';
import {
  getLocalConfig,
  removeLocalConfig,
  setLocalConfig,
} from './localpersistence';
import { Ref, ref } from 'vue';
import * as O from 'fp-ts/Option';
import authQuery from './backend/rest/authQuery';
import { COOKIES_NOT_FOUND, UNAUTHORIZED } from './errors';

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

const signOut = async (reloadWindow = false) => {
  await authQuery.logout();

  // Reload the window if both `access_token` and `refresh_token`is invalid
  // there by the user is taken to the login page
  if (reloadWindow) {
    window.location.reload();
  }

  currentUser$.next(null);
  removeLocalConfig('login_state');

  authEvents$.next({
    event: 'logout',
  });
};

const getUserDetails = async () => {
  const res = await authQuery.getUserDetails();
  return res.data;
};
const isGettingInitialUser: Ref<null | boolean> = ref(null);

const setUser = (user: HoppUser | null) => {
  currentUser$.next(user);
  setLocalConfig('login_state', JSON.stringify(user));
};

const setInitialUser = async () => {
  isGettingInitialUser.value = true;
  const res = await getUserDetails();

  if (res.errors?.[0]) {
    const [error] = res.errors;

    if (error.message === COOKIES_NOT_FOUND) {
      setUser(null);
    } else if (error.message === UNAUTHORIZED) {
      const isRefreshSuccess = await refreshToken();

      if (isRefreshSuccess) {
        setInitialUser();
      } else {
        setUser(null);
        signOut(true);
      }
    }
  } else if (res.data?.me) {
    const { uid, displayName, email, photoURL, isAdmin } = res.data.me;

    const hoppUser: HoppUser = {
      uid,
      displayName,
      email,
      photoURL,
      emailVerified: true,
      isAdmin,
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

const elevateUser = async () => {
  const res = await authQuery.elevateUser();
  return Boolean(res.data?.isAdmin);
};

const sendMagicLink = async (email: string) => {
  const res = await authQuery.sendMagicLink(email);
  if (!res.data?.deviceIdentifier) {
    throw new Error('test: does not get device identifier');
  }
  setLocalConfig('deviceIdentifier', res.data.deviceIdentifier);
  return res.data;
};

export const auth = {
  getCurrentUserStream: () => currentUser$,
  getAuthEventsStream: () => authEvents$,
  getCurrentUser: () => currentUser$.value,
  getUserDetails,
  performAuthInit: () => {
    const currentUser = JSON.parse(getLocalConfig('login_state') ?? 'null');
    currentUser$.next(currentUser);
    return setInitialUser();
  },

  signInWithEmail: (email: string) => sendMagicLink(email),

  isSignInWithEmailLink: (url: string) => {
    const urlObject = new URL(url);
    const searchParams = new URLSearchParams(urlObject.search);
    return Boolean(searchParams.get('token'));
  },

  signInUserWithGoogle: () => {
    window.location.href = `${
      import.meta.env.VITE_BACKEND_API_URL
    }/auth/google?redirect_uri=${import.meta.env.VITE_ADMIN_URL}`;
  },

  signInUserWithGithub: () => {
    window.location.href = `${
      import.meta.env.VITE_BACKEND_API_URL
    }/auth/github?redirect_uri=${import.meta.env.VITE_ADMIN_URL}`;
  },

  signInUserWithMicrosoft: () => {
    window.location.href = `${
      import.meta.env.VITE_BACKEND_API_URL
    }/auth/microsoft?redirect_uri=${import.meta.env.VITE_ADMIN_URL}`;
  },

  signInWithEmailLink: (url: string) => {
    const urlObject = new URL(url);
    const searchParams = new URLSearchParams(urlObject.search);
    const token = searchParams.get('token');
    const deviceIdentifier = getLocalConfig('deviceIdentifier');

    return authQuery.signInWithEmailLink(token, deviceIdentifier);
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

  signOutUser: (reloadWindow = false) => signOut(reloadWindow),

  processMagicLink: async () => {
    if (auth.isSignInWithEmailLink(window.location.href)) {
      const deviceIdentifier = getLocalConfig('deviceIdentifier');

      if (!deviceIdentifier) {
        throw new Error(
          'Device Identifier not found, you can only signin from the browser you generated the magic link'
        );
      }

      await auth.signInWithEmailLink(window.location.href);

      removeLocalConfig('deviceIdentifier');
      window.location.href = import.meta.env.VITE_ADMIN_URL;
    }
  },

  getAllowedAuthProviders: async () => {
    const res = await authQuery.getProviders();
    return res.data?.providers;
  },

  getFirstTimeInfraSetupStatus: async (): Promise<boolean> => {
    try {
      const res = await authQuery.getFirstTimeInfraSetupStatus();
      return res.data?.value === 'true';
    } catch (err) {
      // Setup is not done
      return true;
    }
  },

  updateFirstTimeInfraSetupStatus: async () => {
    try {
      await authQuery.updateFirstTimeInfraSetupStatus();
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  },
};
