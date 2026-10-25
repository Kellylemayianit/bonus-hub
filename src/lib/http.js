import { currentUser } from './auth.js';

export const page = (h, status = 200, headers = {}) =>
  new Response(String(h), { status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'private, no-store', ...headers } });
export const redirect = (to, headers = {}) => new Response(null, { status: 303, headers: { location: to, ...headers } });
export const form = async (request) => Object.fromEntries((await request.formData()).entries());
export const getBusiness = (env, userId) => env.DB.prepare('SELECT * FROM businesses WHERE owner_id = ?').bind(userId).first();

// Where should this person be? One place decides, so routes stay thin.
export function homeFor(user, b) {
  if (!user) return '/login';
  if (user.is_admin) return '/admin';
  if (!user.email_verified) return '/check-email';
  if (!b) return '/onboarding/role';
  if (b.status === 'approved') return '/dashboard';
  if (b.submitted_at) return '/pending';
  return { 2: '/onboarding/role', 3: '/onboarding/profile', 4: '/onboarding/documents' }[b.onboarding_step] || '/pending';
}

// Returns { user, b } or a Response to send back.
export async function requireUser(env, request, { admin = false } = {}) {
  const user = await currentUser(env, request);
  if (!user) return redirect('/login');
  if (admin) return user.is_admin ? { user } : new Response('Forbidden', { status: 403 });
  if (!user.email_verified) return redirect('/check-email');
  return { user, b: await getBusiness(env, user.id) };
}
export const queueEmail = (env, to, subject, body) =>
  env.DB.prepare('INSERT INTO email_outbox (to_email,subject,body) VALUES (?,?,?)').bind(to, subject, body);
