import { gqlApi, restApi } from '~/helpers/axiosConfig';

export default {
  getUserDetails: () =>
    gqlApi.post('', {
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
  refreshToken: () => restApi.get('/auth/refresh'),
  elevateUser: () => restApi.get('/auth/verify/admin'),
  sendMagicLink: (email: string) =>
    restApi.post('/auth/signin?origin=admin', {
      email,
    }),
  signInWithEmailLink: (
    token: string | null,
    deviceIdentifier: string | null
  ) =>
    restApi.post('/auth/verify', {
      token,
      deviceIdentifier,
    }),
  logout: () => restApi.get('/auth/logout'),
};
