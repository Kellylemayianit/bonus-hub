import { html } from '../lib/html.js';
import { layout } from './layout.js';

export function pendingPage({ user, b }) {
  const stage = { pending: 4, needs_documents: 4, rejected: 4, suspended: 5 }[b.status] || 4;
  const items = ['Registered', 'Profile complete', 'Documents sent', 'Admin review', 'Go live'];
  const heading = { pending: 'Your account is under review', needs_documents: 'The admin needs one more thing',
    rejected: 'Your application was declined', suspended: 'Your account is suspended' }[b.status];
  return layout({ title: 'Pending approval', user, right: html`<span class="pill ${b.status}">${b.status.replace('_', ' ')}</span>`, body: html`
<main><div class="col"><section class="card"><div><h1>${heading}</h1>
<p class="sub">${b.name}. Nothing you add is public yet. We will email you as soon as an admin has made a decision.</p></div>
<ol class="steps">${items.map((l, i) => html`<li class="${i + 1 < stage ? 'done' : i + 1 === stage ? 'cur' : ''}"><span class="n">${i + 1 < stage ? '\u2713' : i + 1}</span>${l}</li>`)}</ol>
${b.review_note ? html`<div class="note warn"><div><strong>Note from the admin</strong><br>${b.review_note}</div></div>` : ''}
${b.status === 'needs_documents' || b.status === 'rejected' ? html`<div><a class="btn" href="/onboarding/documents">${b.status === 'rejected' ? 'Update and resubmit' : 'Upload document'}</a></div>` : ''}
</section></div>
<aside class="card"><h2>You can do this now</h2><ol style="list-style:none;padding:0"><li><a href="/onboarding/profile">Edit business profile ›</a></li><li><a href="/onboarding/documents">Manage verification documents ›</a></li><li><a href="/onboarding/role">Review your declared capabilities ›</a></li></ol>
<h2>Unlocked after approval</h2><ol><li>Post products for sale</li><li>Send inquiries and chat</li><li>Post sourcing requests</li><li>Appear in public search</li></ol></aside></main>` });
}
