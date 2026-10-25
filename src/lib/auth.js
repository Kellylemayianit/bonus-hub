const enc = new TextEncoder();
const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const rand = (n = 32) => b64(crypto.getRandomValues(new Uint8Array(n))).replace(/[+/=]/g, '');
const iso = (ms) => new Date(Date.now() + ms).toISOString();

async function pbkdf2(password, salt) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  return crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 100000 }, key, 256);
}
export async function hashPassword(pw) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return `${b64(salt)}:${b64(await pbkdf2(pw, salt))}`;
}
export async function verifyPassword(pw, stored) {
  const [s, h] = stored.split(':');
  return b64(await pbkdf2(pw, unb64(s))) === h;
}

export async function createSession(env, userId) {
  const id = rand(32);
  await env.DB.prepare('INSERT INTO sessions (id,user_id,expires_at) VALUES (?,?,?)').bind(id, userId, iso(30 * 864e5)).run();
  return id;
}
export const sessionCookie = (id, maxAge = 30 * 86400) =>
  `sid=${id}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;

export async function currentUser(env, request) {
  const sid = /(?:^|;\s*)sid=([^;]+)/.exec(request.headers.get('cookie') || '')?.[1];
  if (!sid) return null;
  return env.DB.prepare(
    `SELECT u.id, u.email, u.email_verified, u.is_admin FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.id = ? AND s.expires_at > ?`).bind(sid, new Date().toISOString()).first();
}
export async function createToken(env, userId, purpose, ttlMs = 864e5) {
  const token = rand(24);
  await env.DB.prepare('INSERT INTO tokens (token,user_id,purpose,expires_at) VALUES (?,?,?,?)').bind(token, userId, purpose, iso(ttlMs)).run();
  return token;
}
export async function verifyTurnstile(env, request, token) {
  if (!env.TURNSTILE_SECRET) return true; // dev: skipped when no secret is configured
  const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: new URLSearchParams({ secret: env.TURNSTILE_SECRET, response: token || '', remoteip: request.headers.get('CF-Connecting-IP') || '' }),
  });
  return (await r.json()).success === true;
}
export const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
