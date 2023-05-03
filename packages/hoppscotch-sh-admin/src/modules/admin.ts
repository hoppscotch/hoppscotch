import { auth } from '~/helpers/auth';
import { HoppModule } from '.';

const isAdmin = () => {
  const user = auth.getCurrentUser();
  return user ? user.isAdmin : false;
};

const GUEST_ROUTES = ['index', 'enter'];

const isGuestRoute = (to: unknown) => GUEST_ROUTES.includes(to as string);

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
  onBeforeRouteChange(to, from, next) {
    if (!isGuestRoute(to.name) && !isAdmin()) {
      next({ name: 'index' });
    } else if (isGuestRoute(to.name) && isAdmin()) {
      next({ name: 'dashboard' });
    } else {
      next();
    }
  },
};
