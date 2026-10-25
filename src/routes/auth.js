import { hashPassword, verifyPassword, createSession, sessionCookie, verifyTurnstile, currentUser } from '../lib/auth.js';
import { page, redirect, form, getBusiness, homeFor } from '../lib/http.js';
import { issueOtp, liveOtp, checkOtp } from '../lib/otp.js';
import { registerPage, loginPage, verifyPage } from '../templates/auth.js';

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
    return redirect('/verify', { 'set-cookie': sessionCookie(await createSession(env, uid)) });
  }],
  ['GET', '/verify', async (req, env) => {
    const user = await currentUser(env, req);
    if (!user) return redirect('/login');
    if (user.email_verified) return redirect(homeFor(user, await getBusiness(env, user.id)));
    const otp = (await liveOtp(env, user.id)) || (await issueOtp(env, user.id));
    return page(verifyPage({ user, otp }));
  }],
  ['POST', '/verify', async (req, env) => {
    const user = await currentUser(env, req);
    if (!user) return redirect('/login');
    const f = await form(req);
    const res = await checkOtp(env, user.id, f.code);
    if (res === 'ok') return redirect('/onboarding/role');
    const error = { expired: 'That code expired. Get a new one.', wrong: 'Wrong code. Try again.', locked: 'Too many attempts. Get a new code.' }[res];
    const otp = await liveOtp(env, user.id);
    return page(verifyPage({ user, otp, error }), 400);
  }],
  ['POST', '/verify/new', async (req, env) => {
    const user = await currentUser(env, req);
    if (!user) return redirect('/login');
    await issueOtp(env, user.id);
    return redirect('/verify');
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
