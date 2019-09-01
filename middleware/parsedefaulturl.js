export default function({ route, redirect }) {
  if(route.fullPath !== '/') {
    return redirect('/');
  }
} 