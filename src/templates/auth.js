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
export const verifyPage = ({ user, otp, error }) => layout({ title: 'Verify', user, body: html`<main><div class="col" style="max-width:480px;margin:0 auto"><section class="card">
<div><h1>Verify your account</h1><p class="sub">Enter the code below. It is valid for 60 seconds.</p></div>
${flash(error)}
${otp ? html`<div style="text-align:center"><div id="code" style="font-size:40px;font-weight:800;letter-spacing:8px">${otp.code}</div>
<div class="sub" style="font-size:14px">Expires in <b id="t">60</b>s</div></div>
<form method="post" style="display:flex;flex-direction:column;gap:16px">
<label class="field">Type the code<input name="code" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" required autofocus autocomplete="one-time-code"></label>
<button class="btn">Verify</button></form>
<script>(function(){var end=Date.parse(${JSON.stringify(otp.expires)}),t=document.getElementById('t');
function tick(){var s=Math.max(0,Math.round((end-Date.now())/1000));t.textContent=s;if(!s)location.reload();}
tick();setInterval(tick,1000);})();</script>`
 : html`<div class="note warn">Your code expired.</div>`}
<form method="post" action="/verify/new"><button class="btn ghost">Get a new code</button></form>
</section></div></main>` });
