import { html } from '../lib/html.js';
import { layout, flash } from './layout.js';

const form = (mode, { error, siteKey } = {}) => {
  const reg = mode === 'register';
  return layout({
    title: reg ? 'Create account' : 'Log in',
    body: html`<main><div class="col" style="max-width:480px;margin:0 auto"><section class="card">
<div><h1>${reg ? 'Create your business account' : 'Log in'}</h1>
<p class="sub">${reg ? 'Bonas Hub is for businesses only. You will verify your email, then tell us what your business does.' : 'Welcome back.'}</p></div>
${flash(error)}
<form method="post" style="display:flex;flex-direction:column;gap:16px">
<label class="field">Work email<input type="email" name="email" required autocomplete="email"></label>
<label class="field">Password<input type="password" name="password" required minlength="10" autocomplete="${reg ? 'new-password' : 'current-password'}"></label>
${reg && siteKey ? html`<div class="cf-turnstile" data-sitekey="${siteKey}"></div><script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>` : ''}
<button class="btn">${reg ? 'Create account' : 'Log in'}</button></form>
<p class="sub" style="margin:0;font-size:14px">${reg ? html`Already registered? <a href="/login">Log in</a>` : html`New here? <a href="/register">Create an account</a>`}</p>
</section></div></main>`,
  });
};
export const registerPage = (o) => form('register', o);
export const loginPage = (o) => form('login', o);
export const checkEmailPage = (email) => layout({ title: 'Check your email', body: html`<main><div class="col" style="max-width:480px;margin:0 auto"><section class="card">
<h1>Check your email</h1><p class="sub">We sent a verification link to ${email}. Open it to continue.</p></section></div></main>` });
