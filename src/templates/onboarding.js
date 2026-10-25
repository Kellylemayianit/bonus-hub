import { html } from '../lib/html.js';
import { layout, steps, flash } from './layout.js';

const side = html`<aside class="card"><h2>What happens next</h2><ol>
<li><strong>Complete your profile.</strong> Business name, country, categories and contact channels.</li>
<li><strong>Upload verification documents.</strong> Kept private, seen only by the admin.</li>
<li><strong>Admin review.</strong> You can be approved, asked for more documents, or declined with a reason.</li>
<li><strong>Go live.</strong> Your pages and listings become public and you can post freely.</li></ol></aside>`;

const shell = (title, n, inner, user, label) =>
  layout({ title, user, right: html`Step ${n} of 4 · ${label}`, body: html`<main><div class="col">${steps(n)}<section class="card">${inner}</section></div>${side}</main>` });

const ROLE_COPY = {
  manufacturer: 'I make products and sell them to suppliers and wholesalers.',
  supplier: 'I buy from manufacturers and sell to wholesalers.',
  wholesaler: 'I source products in bulk and distribute them onward.',
};

export function rolePage({ user, b, error }) {
  const role = b.role || 'manufacturer';
  return shell('Role and capabilities', 2, html`
<div><h1>What does your business do?</h1><p class="sub">Pick your main role. You can also declare that you buy or sell beyond it. An admin confirms this when reviewing your account.</p></div>
${flash(error)}
<form method="post" style="display:flex;flex-direction:column;gap:28px">
<fieldset><legend>Main role</legend>${Object.entries(ROLE_COPY).map(([r, d]) => html`
<label class="opt"><input type="radio" name="role" value="${r}" ${r === role ? 'checked' : ''}><span><b>${r[0].toUpperCase() + r.slice(1)}</b><span>${d}</span></span></label>`)}</fieldset>
<fieldset><legend>On Bonas Hub I want to</legend>
<label class="opt"><input type="checkbox" name="can_sell" ${b.can_sell ? 'checked' : ''}><span><b>Sell</b><span>List products and answer inquiries and requests.</span></span></label>
<label class="opt"><input type="checkbox" name="can_buy" ${b.can_buy ? 'checked' : ''}><span><b>Buy</b><span>Post sourcing requests and contact other sellers. Manufacturers often buy raw materials and packaging.</span></span></label></fieldset>
<div class="note">Your account stays private until an admin approves it. Until then you can complete your profile and upload documents.</div>
<div class="row"><span></span><button class="btn">Continue</button></div></form>`, user, 'Role and capabilities');
}

export function profilePage({ user, b, error }) {
  return shell('Business profile', 3, html`
<div><h1>Tell us about your business</h1><p class="sub">This becomes your public profile once approved.</p></div>${flash(error)}
<form method="post" style="display:flex;flex-direction:column;gap:16px">
<label class="field">Business name<input name="name" required value="${b.name || ''}"></label>
<label class="field">Country (2-letter code, e.g. KE)<input name="country" required maxlength="2" value="${b.country || 'KE'}" style="text-transform:uppercase"></label>
<label class="field">About<textarea name="about" maxlength="1500">${b.about || ''}</textarea></label>
<label class="field">Phone<input name="phone" value="${b.phone || ''}"></label>
<label class="field">WhatsApp<input name="whatsapp" value="${b.whatsapp || ''}"></label>
<label class="field">Contact email<input type="email" name="contact_email" value="${b.contact_email || user.email}"></label>
<div class="row"><a class="btn ghost" href="/onboarding/role">Back</a><button class="btn">Continue</button></div></form>`, user, 'Business profile');
}

export function docsPage({ user, b, docs, error }) {
  return shell('Verification documents', 4, html`
<div><h1>Verification documents</h1><p class="sub">Private. Only the admin can open these. Upload your registration certificate, tax registration and a director ID.</p></div>${flash(error)}
${b.review_note && b.status === 'needs_documents' ? html`<div class="note warn"><div><strong>The admin asked for more:</strong> ${b.review_note}</div></div>` : ''}
<ul style="margin:0;padding-left:20px">${docs.length ? docs.map((d) => html`<li>${d.filename} <span class="sub" style="font-size:13px">(${d.kind})</span></li>`) : html`<li class="sub">Nothing uploaded yet.</li>`}</ul>
<form method="post" action="/onboarding/documents/upload" enctype="multipart/form-data" style="display:flex;flex-direction:column;gap:16px">
<label class="field">Document type<select name="kind"><option value="registration">Business registration certificate</option><option value="tax">Tax registration</option><option value="director_id">Director identification</option><option value="other">Other</option></select></label>
<label class="field">File (PDF, JPG or PNG, max 5 MB)<input type="file" name="file" accept=".pdf,.jpg,.jpeg,.png" required></label>
<button class="btn ghost">Upload</button></form>
<form method="post" action="/onboarding/submit" class="row"><a class="btn ghost" href="/onboarding/profile">Back</a><button class="btn">Submit for review</button></form>`, user, 'Verification documents');
}
