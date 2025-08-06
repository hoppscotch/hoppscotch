import { auth } from '~/helpers/auth';
import { UNAUTHORIZED } from '~/helpers/errors';
import { HoppModule } from '.';

const isSetupRoute = (to: unknown) => to === 'setup';

const isGuestRoute = (to: unknown) =>
  ['index', 'enter', 'onboarding'].includes(to as string);

const getFirstTimeInfraSetupStatus = async () => {
  const isInfraNotSetup = await auth.getFirstTimeInfraSetupStatus();
  return isInfraNotSetup;
};

/**
 * @module routers
 */

/**
 * @function
 * @name onBeforeRouteChange
 * @param {object} to
 * @param {object} from
 * @param {function} next
 * @returns {void}
 */
export default <HoppModule>{
  async onBeforeRouteChange(to, _from, next) {
    // Check if onboarding is completed
    const onboardingStatus = await auth.getOnboardingStatus();

    if (
      !onboardingStatus?.onboardingCompleted &&
      to.name !== 'onboarding' &&
      to.name === 'index'
    ) {
      // If onboarding is not completed, redirect to the onboarding page
      return next({ name: 'onboarding' });
    }

    const res = await auth.getUserDetails();

    // Allow performing the silent refresh flow for an invalid access token state
    if (res.errors?.[0].message === UNAUTHORIZED) {
      return next();
    }

    if (
      !onboardingStatus?.onboardingCompleted &&
      !onboardingStatus?.canReRunOnboarding &&
      to.name !== 'index' &&
      to.name === 'onboarding'
    ) {
      return next();
    }

    if (
      onboardingStatus?.onboardingCompleted &&
      !onboardingStatus.canReRunOnboarding &&
      to.name === 'onboarding'
    ) {
      // If onboarding is completed, redirect to the dashboard
      return next({ name: 'index' });
    }

    const isAdmin = res.data?.me.isAdmin;

    // Route Guards
    if (!isGuestRoute(to.name) && !isAdmin) {
      /**
       * Reroutes the user to the login page if user is not logged in
       * and is not an admin
       */
      return next({ name: 'index' });
    }

    if (isAdmin && onboardingStatus?.onboardingCompleted) {
      // These route guards applies to the case where the user is logged in successfully and validated as an admin
      const isInfraNotSetup = await getFirstTimeInfraSetupStatus();

      /**
       * Reroutes the user to the dashboard homepage if they have setup the infra already
       * Else, the Setup page
       */
      if (isGuestRoute(to.name)) {
        const name = isInfraNotSetup ? 'setup' : 'dashboard';
        return next({ name });
      }
      /**
       * Reroutes the user to the dashboard homepage if they have setup the infra already
       * and are trying to access the setup page
       */
      if (isSetupRoute(to.name) && !isInfraNotSetup) {
        return next({ name: 'dashboard' });
      }
      /**
       * Reroutes the user to the setup page if they have not setup the infra yet
       * and tries to access a valid route which is not a guest route
       */
      if (isInfraNotSetup && !isSetupRoute(to.name)) {
        return next({ name: 'setup' });
      }
    }

    next();
  },
};
