import { Middleware } from '@nuxt/types';

const middleware: Middleware = ({ route, redirect }) => {
  if (route.fullPath !== "/") {
    return redirect("/");
  }
}

export default middleware;
