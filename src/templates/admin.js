import { html } from '../lib/html.js';
import { layout } from './layout.js';
import { allowedActions } from '../lib/state.js';

const FILTERS = [['pending', 'Pending'], ['needs_documents', 'Needs documents'], ['approved', 'Approved'], ['suspended', 'Suspended']];
const label = (s) => s[0].toUpperCase() + s.slice(1);

export function adminQueue({ user, rows, filter, sel, docs, counts, error }) {
  const caps = (r) => [r.can_sell && 'Sell', r.can_buy && 'Buy'].filter(Boolean).join(', ') || '—';
  return layout({ title: 'Approval queue', user, right: html`Admin · Site owner`, body: html`<main style="max-width:1280px"><div class="col">
<section class="card"><div><h1>Approval queue</h1><p class="sub">Review new businesses before anything they post becomes public.</p></div>
<nav class="tabs">${FILTERS.map(([k, l]) => html`<a class="${k === filter ? 'on' : ''}" href="/admin?status=${k}">${l}${counts[k] ? ` ${counts[k]}` : ''}</a>`)}</nav>
<table><thead><tr><th>Business</th><th>Role</th><th>Declared</th><th>Documents</th></tr></thead><tbody>
${rows.length ? rows.map((r) => html`<tr class="${sel && sel.id === r.id ? 'sel' : ''}"><td><a href="/admin?status=${filter}&id=${r.id}">${r.name || '(unnamed)'}</a></td><td>${label(r.role || '—')}</td><td>${caps(r)}</td><td>${r.doc_count}</td></tr>`)
  : html`<tr><td colspan="4" class="sub">Nothing here.</td></tr>`}</tbody></table></section></div>
${sel ? html`<aside class="card" style="flex:0 1 380px"><h2>${sel.name}</h2><p class="sub" style="margin:0;font-size:14px">${label(sel.role || '—')} · ${sel.country} · registered ${(sel.created_at || '').slice(0, 10)}</p>
${error ? html`<div class="note err">${error}</div>` : ''}
<div><strong>Documents</strong><ul style="padding-left:18px">${docs.length ? docs.map((d) => html`<li>${d.filename} (${d.kind}) <a href="/admin/doc/${d.id}" target="_blank" rel="noopener">Open</a></li>`) : html`<li>None uploaded</li>`}</ul></div>
<form method="post" action="/admin/business/${sel.id}" style="display:flex;flex-direction:column;gap:12px">
<strong>Confirm declared capabilities</strong>
<label><input type="checkbox" name="can_sell" ${sel.can_sell ? 'checked' : ''}> Can sell (list products)</label>
<label><input type="checkbox" name="can_buy" ${sel.can_buy ? 'checked' : ''}> Can buy (post requests)</label>
<label class="field">Note to the business (shown if you ask for documents or decline)<textarea name="note"></textarea></label>
<input type="hidden" name="back" value="${filter}">
<div style="display:flex;flex-wrap:wrap;gap:8px">${allowedActions(sel.status).map((a) =>
  html`<button class="btn sm ${a === 'reject' || a === 'suspend' ? 'danger' : a === 'approve' || a === 'reinstate' ? '' : 'ghost'}" name="action" value="${a}">${{ approve: 'Approve', reject: 'Decline', request_documents: 'Ask for documents', suspend: 'Suspend', reinstate: 'Reinstate', resubmit: 'Resubmit' }[a]}</button>`)}</div>
<p class="sub" style="font-size:13px;margin:0">Every decision is saved in the audit log.</p></form></aside>` : ''}</main>` });
}
