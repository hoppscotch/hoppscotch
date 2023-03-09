import { auth } from '~/helpers/auth';
import { HoppModule } from '.';

const isAdmin = () => {
  const user = auth.getCurrentUser();
  return user ? user.isAdmin : false;
};

export default <HoppModule>{
  onBeforeRouteChange(to, from, next) {
    if (to.name !== 'index' && !isAdmin()) {
      next({ name: 'index' });
    } else if (to.name === 'index' && isAdmin()) {
      next({ name: 'dashboard' });
    } else {
      next();
    }
  },
};
