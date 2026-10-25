import { hashPassword, verifyPassword, createSession, sessionCookie, createToken, verifyTurnstile, currentUser } from '../lib/auth.js';
import { page, redirect, form, getBusiness, homeFor, queueEmail } from '../lib/http.js';
import { registerPage, loginPage, checkEmailPage } from '../templates/auth.js';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const authRoutes = [
  ['GET', '/register', async (req, env) => page(registerPage({ siteKey: env.TURNSTILE_SITE_KEY }))],
  ['POST', '/register', async (req, env) => {
    const f = await form(req);
    const email = (f.email || '').trim().toLowerCase();
    const bad = (error) => page(registerPage({ error, siteKey: env.TURNSTILE_SITE_KEY }), 400);
    if (!(await verifyTurnstile(env, req, f['cf-turnstile-response']))) return bad('Please complete the human check.');
    if (!EMAIL.test(email)) return bad('Enter a valid email address.');
    if ((f.password || '').length < 10) return bad('Use a password of at least 10 characters.');
    if (await env.DB.prepare('SELECT 1 FROM users WHERE email = ?').bind(email).first()) return bad('That email is already registered. Try logging in.');

    const isAdmin = (env.ADMIN_EMAILS || '').toLowerCase().split(',').map((s) => s.trim()).includes(email) ? 1 : 0;
    const { meta } = await env.DB.prepare('INSERT INTO users (email,password_hash,is_admin) VALUES (?,?,?)').bind(email, await hashPassword(f.password), isAdmin).run();
    const uid = meta.last_row_id;
    if (!isAdmin) await env.DB.prepare('INSERT INTO businesses (owner_id) VALUES (?)').bind(uid).run();
    const token = await createToken(env, uid, 'verify_email');
    const link = `${env.APP_URL}/verify?token=${token}`;
    await queueEmail(env, email, 'Verify your Bonas Hub email', `Welcome to Bonas Hub. Verify your email to continue:\n\n${link}`).run();
    if (!env.RESEND_API_KEY) console.log('[dev] verify link:', link);
    return redirect('/check-email', { 'set-cookie': sessionCookie(await createSession(env, uid)) });
  }],
  ['GET', '/check-email', async (req, env) => {
    const user = await currentUser(env, req);
    if (!user) return redirect('/login');
    if (user.email_verified) return redirect(homeFor(user, await getBusiness(env, user.id)));
    return page(checkEmailPage(user.email));
  }],
  ['GET', '/verify', async (req, env) => {
    const token = new URL(req.url).searchParams.get('token');
    const t = await env.DB.prepare("SELECT user_id FROM tokens WHERE token=? AND purpose='verify_email' AND expires_at>?").bind(token, new Date().toISOString()).first();
    if (!t) return page(loginPage({ error: 'That verification link is invalid or has expired.' }), 400);
    await env.DB.batch([
      env.DB.prepare('UPDATE users SET email_verified=1 WHERE id=?').bind(t.user_id),
      env.DB.prepare('DELETE FROM tokens WHERE token=?').bind(token),
    ]);
    return redirect('/onboarding/role');
  }],
  ['GET', '/login', async (req, env) => page(loginPage())],
  ['POST', '/login', async (req, env) => {
    const f = await form(req);
    const u = await env.DB.prepare('SELECT * FROM users WHERE email=?').bind((f.email || '').trim().toLowerCase()).first();
    // Same message for unknown email and wrong password.
    if (!u || !(await verifyPassword(f.password || '', u.password_hash))) return page(loginPage({ error: 'Email or password is incorrect.' }), 401);
    const b = await getBusiness(env, u.id);
    return redirect(homeFor(u, b), { 'set-cookie': sessionCookie(await createSession(env, u.id)) });
  }],
  ['POST', '/logout', async (req, env) => {
    const sid = /(?:^|;\s*)sid=([^;]+)/.exec(req.headers.get('cookie') || '')?.[1];
    if (sid) await env.DB.prepare('DELETE FROM sessions WHERE id=?').bind(sid).run();
    return redirect('/login', { 'set-cookie': sessionCookie('', 0) });
  }],
];
