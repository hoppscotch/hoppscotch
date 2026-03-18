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
  getProviders: () => restApi.get('/auth/providers'),
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
  getFirstTimeInfraSetupStatus: () => restApi.get('/site/setup'),
  updateFirstTimeInfraSetupStatus: () => restApi.put('/site/setup'),
  addOnBoardingConfigs: (config: Record<string, any>) =>
    restApi.post('/onboarding/config', config),
  getOnboardingStatus: () => restApi.get('/onboarding/status'),
  getOnBoardingConfigs: (token: string) =>
    restApi.get('/onboarding/config?token=' + token),
  logout: () => restApi.get('/auth/logout'),
};
