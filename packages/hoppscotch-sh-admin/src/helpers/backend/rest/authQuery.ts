import api from '~/helpers/api';

export default {
  getMe: () =>
    api().post<{
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
    }>(`${import.meta.env.VITE_BACKEND_GQL_URL}`, {
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
    }),
  refreshToken: () => api().get('/auth/refresh'),
  elevateUser: () => api().get('/auth/verify/admin'),
  sendMagicLink: (email: string) =>
    api().post('/auth/signin?origin=admin', {
      email,
    }),
  signInWithEmailLink: (
    token: string | null,
    deviceIdentifier: string | null
  ) =>
    api().post('/auth/verify', {
      token: token,
      deviceIdentifier,
    }),
  logout: () => api().get('/auth/logout'),
};
