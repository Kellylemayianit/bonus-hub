import { authRoutes } from './routes/auth.js';
import { onboardingRoutes } from './routes/onboarding.js';
import { adminRoutes } from './routes/admin.js';
import { currentUser } from './lib/auth.js';
import { getBusiness, homeFor, redirect, page } from './lib/http.js';
import { html } from './lib/html.js';
import { layout } from './templates/layout.js';

// One Worker, route modules per domain. Entries are ['GET','/path', fn] or [/^METHOD \/regex$/, fn].
const routes = [...authRoutes, ...onboardingRoutes, ...adminRoutes];

function match(method, path) {
  for (const r of routes) {
    if (typeof r[0] === 'string') { if (r[0] === method && r[1] === path) return [r[2], []]; }
    else { const m = r[0].exec(`${method} ${path}`); if (m) return [r[1], m.slice(1)]; }
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === '/') {
      const user = await currentUser(env, request);
      return user ? redirect(homeFor(user, await getBusiness(env, user.id))) : redirect('/register');
    }
    if (url.pathname === '/dashboard') { // placeholder until step 3
      const user = await currentUser(env, request);
      if (!user) return redirect('/login');
      return page(layout({ title: 'Dashboard', user, body: html`<main><section class="card col"><h1>Dashboard</h1><p class="sub">You are approved. Products, requests and inbox arrive in the next build steps.</p></section></main>` }));
    }
    const hit = match(request.method, url.pathname);
    if (!hit) return env.ASSETS ? env.ASSETS.fetch(request) : new Response('Not found', { status: 404 });
    try { return await hit[0](request, env, ctx, hit[1]); }
    catch (e) { console.error(e); return new Response('Something went wrong.', { status: 500 }); }
  },

  // Drains email_outbox. Step 7 hardens this (retries, backoff); works now if RESEND_API_KEY is set.
  async scheduled(event, env) {
    if (!env.RESEND_API_KEY) return;
    const { results } = await env.DB.prepare('SELECT * FROM email_outbox WHERE sent_at IS NULL AND attempts<5 ORDER BY id LIMIT 20').all();
    for (const m of results) {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST', headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
        body: JSON.stringify({ from: env.MAIL_FROM || 'Bonas Hub <onboarding@resend.dev>', to: m.to_email, subject: m.subject, text: m.body }),
      });
      await env.DB.prepare(r.ok ? "UPDATE email_outbox SET sent_at=datetime('now') WHERE id=?" : 'UPDATE email_outbox SET attempts=attempts+1 WHERE id=?').bind(m.id).run();
    }
  },
};
