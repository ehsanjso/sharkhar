// Password protection middleware for Cloudflare Pages
// Set these in Cloudflare Pages Environment Variables:
// DASHBOARD_USER and DASHBOARD_PASS

const REALM = 'Polymarket Dashboard';

function unauthorized(message = 'Unauthorized') {
  return new Response(message, {
    status: 401,
    headers: {
      'WWW-Authenticate': `Basic realm="${REALM}", charset="UTF-8"`,
    },
  });
}

function parseBasicAuth(request) {
  const authorization = request.headers.get('Authorization');
  if (!authorization || !authorization.startsWith('Basic ')) {
    return null;
  }

  const encoded = authorization.substring(6);
  const decoded = atob(encoded);
  const index = decoded.indexOf(':');

  if (index === -1) {
    return null;
  }

  return {
    user: decoded.substring(0, index),
    pass: decoded.substring(index + 1),
  };
}

export async function onRequest(context) {
  const { request, env, next } = context;

  // Get credentials from environment variables
  const validUser = env.DASHBOARD_USER || 'admin';
  const validPass = env.DASHBOARD_PASS || 'polymarket2024';

  const credentials = parseBasicAuth(request);

  if (!credentials) {
    return unauthorized();
  }

  if (credentials.user !== validUser || credentials.pass !== validPass) {
    return unauthorized('Invalid credentials');
  }

  // Credentials valid, continue to the page
  return next();
}
