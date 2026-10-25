import { html, raw } from '../lib/html.js';

export function layout({ title, body, user, right }) {
  return html`<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} · Bonas Hub</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap">
<link rel="stylesheet" href="/styles.css"></head><body>
<header class="top"><div><a class="logo" href="/">BONAS HUB</a><div class="tag">Where Businesses Meet. Where Trade Grows.</div></div>
<div class="side">${right || ''}${user ? html`<span>${user.email}</span><form method="post" action="/logout"><button class="link">Log out</button></form>` : ''}</div></header>
${body}</body></html>`;
}

export const steps = (cur) => {
  const labels = ['Account', 'Role and capabilities', 'Business profile', 'Verification documents'];
  return html`<ol class="steps">${labels.map((l, i) => {
    const n = i + 1, cls = n < cur ? 'done' : n === cur ? 'cur' : '';
    return html`<li class="${cls}"><span class="n">${n < cur ? raw('&#10003;') : n}</span>${l}</li>`;
  })}</ol>`;
};

export const flash = (msg) => (msg ? html`<div class="note err" role="alert">${msg}</div>` : '');
