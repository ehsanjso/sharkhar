const REALM = 'Polymarket Bot Dashboard';

export async function onRequest(context) {
  const { request, env, next } = context;
  
  const user = env.AUTH_USER || 'admin';
  const pass = env.AUTH_PASS || 'changeme';
  
  const auth = request.headers.get('Authorization');
  if (!auth?.startsWith('Basic ')) {
    return new Response('Unauthorized', {
      status: 401,
      headers: { 'WWW-Authenticate': `Basic realm="${REALM}"` }
    });
  }
  
  const [u, p] = atob(auth.slice(6)).split(':');
  if (u !== user || p !== pass) {
    return new Response('Invalid credentials', { status: 401 });
  }
  
  return next();
}
