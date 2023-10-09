import axios from 'axios';
import { BehaviorSubject, Subject } from 'rxjs';
import {
  getLocalConfig,
  removeLocalConfig,
  setLocalConfig,
} from './localpersistence';
import { Ref, ref, watch } from 'vue';
import * as O from 'fp-ts/Option';
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

  // Regarding `provider` and `accessToken`:
  // The current implementation and use case for these 2 fields are super weird due to legacy.
  // Currrently these fields are only basically populated for Github Auth as we need the access token issued
  // by it to implement Gist submission. I would really love refactor to make this thing more sane.

  /** Name of the provider authenticating (NOTE: See notes on `platform/auth.ts`) */
  provider?: string;
  /** Access Token for the auth of the user against the given `provider`. */
  accessToken?: string;
  emailVerified: boolean;

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

async function logout() {
  await axios.get(`${import.meta.env.VITE_BACKEND_API_URL}/auth/logout`, {
    withCredentials: true,
  });
}

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

async function signInUserWithGithubFB() {
  window.location.href = `${
    import.meta.env.VITE_BACKEND_API_URL
  }/auth/github?redirect_uri=${import.meta.env.VITE_ADMIN_URL}`;
}

async function signInUserWithGoogleFB() {
  window.location.href = `${
    import.meta.env.VITE_BACKEND_API_URL
  }/auth/google?redirect_uri=${import.meta.env.VITE_ADMIN_URL}`;
}

async function signInUserWithMicrosoftFB() {
  window.location.href = `${
    import.meta.env.VITE_BACKEND_API_URL
  }/auth/microsoft?redirect_uri=${import.meta.env.VITE_ADMIN_URL}`;
}

async function getInitialUserDetails() {
  const res = await axios.post<{
    data?: {
      me?: {
        uid: string;
        displayName: string;
        email: string;
        photoURL: string;
        isAdmin: boolean;
        createdOn: string;
        // emailVerified: boolean
      };
    };
    errors?: Array<{
      message: string;
    }>;
  }>(
    `${import.meta.env.VITE_BACKEND_GQL_URL}`,
    {
      query: `query Me {
      me {
        uid
        displayName
        email
        photoURL
        isAdmin
        createdOn
      }
    }`,
    },
    {
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true,
    }
  );

  return res.data;
}

const isGettingInitialUser: Ref<null | boolean> = ref(null);

function setUser(user: HoppUser | null) {
  currentUser$.next(user);
  probableUser$.next(user);

  setLocalConfig('login_state', JSON.stringify(user));
}

async function setInitialUser() {
  isGettingInitialUser.value = true;
  const res = await getInitialUserDetails();

  const error = res.errors && res.errors[0];

  // no cookies sent. so the user is not logged in
  if (error && error.message === 'auth/cookies_not_found') {
    setUser(null);
    isGettingInitialUser.value = false;
    return;
  }

  // cookies sent, but it is expired, we need to refresh the token
  if (error && error.message === 'Unauthorized') {
    const isRefreshSuccess = await refreshToken();

    if (isRefreshSuccess) {
      setInitialUser();
    } else {
      setUser(null);
      await signOut(true);
      isGettingInitialUser.value = false;
    }

    return;
  }

  // no errors, we have a valid user
  if (res.data && res.data.me) {
    const hoppBackendUser = res.data.me;

    const hoppUser: HoppUser = {
      uid: hoppBackendUser.uid,
      displayName: hoppBackendUser.displayName,
      email: hoppBackendUser.email,
      photoURL: hoppBackendUser.photoURL,
      // all our signin methods currently guarantees the email is verified
      emailVerified: true,
      isAdmin: hoppBackendUser.isAdmin,
    };

    if (!hoppUser.isAdmin) {
      const isAdmin = await elevateUser();
      hoppUser.isAdmin = isAdmin;
    }

    setUser(hoppUser);

    isGettingInitialUser.value = false;

    authEvents$.next({
      event: 'login',
      user: hoppUser,
    });

    return;
  }
}

const refreshToken = async () => {
  try {
    const res = await axios.get(
      `${import.meta.env.VITE_BACKEND_API_URL}/auth/refresh`,
      {
        withCredentials: true,
      }
    );
    authEvents$.next({
      event: 'token_refresh',
    });
    return res.status === 200;
  } catch {
    return false;
  }
};

async function elevateUser() {
  const res = await axios.get(
    `${import.meta.env.VITE_BACKEND_API_URL}/auth/verify/admin`,
    {
      withCredentials: true,
    }
  );

  return !!res.data?.isAdmin;
}

async function sendMagicLink(email: string) {
  const res = await axios.post(
    `${import.meta.env.VITE_BACKEND_API_URL}/auth/signin?origin=admin`,
    {
      email,
    },
    {
      withCredentials: true,
    }
  );

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

  getBackendHeaders() {
    return {};
  },
  getGQLClientOptions() {
    return {
      fetchOptions: {
        credentials: 'include',
      },
    };
  },

  /**
   * it is not possible for us to know if the current cookie is expired because we cannot access http-only cookies from js
   * hence just returning if the currentUser$ has a value associated with it
   */
  willBackendHaveAuthError() {
    return !currentUser$.value;
  },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onBackendGQLClientShouldReconnect(func: () => void) {
    authEvents$.subscribe((event) => {
      if (
        event.event == 'login' ||
        event.event == 'logout' ||
        event.event == 'token_refresh'
      ) {
        func();
      }
    });
  },

  /**
   * we cannot access our auth cookies from javascript, so leaving this as null
   */
  getDevOptsBackendIDToken() {
    return null;
  },
  async performAuthInit() {
    const probableUser = JSON.parse(getLocalConfig('login_state') ?? 'null');
    probableUser$.next(probableUser);
    await setInitialUser();
  },

  waitProbableLoginToConfirm() {
    return new Promise<void>((resolve, reject) => {
      if (this.getCurrentUser()) {
        resolve();
      }

      if (!probableUser$.value) reject(new Error('no_probable_user'));

      const unwatch = watch(isGettingInitialUser, (val) => {
        if (val === true || val === false) {
          resolve();
          unwatch();
        }
      });
    });
  },

  async signInWithEmail(email: string) {
    await sendMagicLink(email);
  },

  isSignInWithEmailLink(url: string) {
    const urlObject = new URL(url);
    const searchParams = new URLSearchParams(urlObject.search);

    return !!searchParams.get('token');
  },

  async verifyEmailAddress() {
    return;
  },
  async signInUserWithGoogle() {
    await signInUserWithGoogleFB();
  },
  async signInUserWithGithub() {
    await signInUserWithGithubFB();
    return undefined;
  },
  async signInUserWithMicrosoft() {
    await signInUserWithMicrosoftFB();
  },
  async signInWithEmailLink(email: string, url: string) {
    const urlObject = new URL(url);
    const searchParams = new URLSearchParams(urlObject.search);

    const token = searchParams.get('token');
    const deviceIdentifier = getLocalConfig('deviceIdentifier');

    await axios.post(
      `${import.meta.env.VITE_BACKEND_API_URL}/auth/verify`,
      {
        token: token,
        deviceIdentifier,
      },
      {
        withCredentials: true,
      }
    );
  },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async setEmailAddress(_email: string) {
    return;
  },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async setDisplayName(name: string) {
    return;
  },

  async performAuthRefresh() {
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

  async signOutUser(reloadWindow = false) {
    await signOut(reloadWindow);
  },

  async processMagicLink() {
    if (this.isSignInWithEmailLink(window.location.href)) {
      const deviceIdentifier = getLocalConfig('deviceIdentifier');

      if (!deviceIdentifier) {
        throw new Error(
          'Device Identifier not found, you can only signin from the browser you generated the magic link'
        );
      }

      await this.signInWithEmailLink(deviceIdentifier, window.location.href);

      removeLocalConfig('deviceIdentifier');
      window.location.href = import.meta.env.VITE_ADMIN_URL;
    }
  },
};
