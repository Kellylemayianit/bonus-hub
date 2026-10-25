import { page, redirect, form, requireUser, homeFor } from '../lib/http.js';
import { slugify } from '../lib/auth.js';
import { ROLES, defaultCaps, transition } from '../lib/state.js';
import { rolePage, profilePage, docsPage } from '../templates/onboarding.js';
import { pendingPage } from '../templates/pending.js';

const MAX_BYTES = 5 * 1024 * 1024;
const TYPES = { 'application/pdf': 'pdf', 'image/jpeg': 'jpg', 'image/png': 'png' };

// Wraps a handler: must be a verified, non-admin, not-yet-approved business owner.
const guard = (fn) => async (req, env, ctx) => {
  const r = await requireUser(env, req);
  if (r instanceof Response) return r;
  if (r.user.is_admin) return redirect('/admin');
  if (r.b.status === 'approved') return redirect('/dashboard');
  return fn(req, env, r, ctx);
};
const docs = (env, id) => env.DB.prepare('SELECT * FROM verification_documents WHERE business_id=? ORDER BY id').bind(id).all().then((r) => r.results);

export const onboardingRoutes = [
  ['GET', '/onboarding/role', guard(async (req, env, { user, b }) => {
    const view = b.role ? b : { ...b, role: 'manufacturer', ...defaultCaps('manufacturer') };
    return page(rolePage({ user, b: view }));
  })],
  ['POST', '/onboarding/role', guard(async (req, env, { user, b }) => {
    const f = await form(req);
    const can_sell = f.can_sell ? 1 : 0, can_buy = f.can_buy ? 1 : 0;
    if (!ROLES.includes(f.role)) return page(rolePage({ user, b, error: 'Pick your main role.' }), 400);
    if (!can_sell && !can_buy) return page(rolePage({ user, b: { ...b, role: f.role }, error: 'Choose at least one: sell or buy.' }), 400);
    await env.DB.prepare('UPDATE businesses SET role=?, can_sell=?, can_buy=?, onboarding_step=MAX(onboarding_step,3) WHERE id=?').bind(f.role, can_sell, can_buy, b.id).run();
    return redirect('/onboarding/profile');
  })],
  ['GET', '/onboarding/profile', guard(async (req, env, { user, b }) => page(profilePage({ user, b })))],
  ['POST', '/onboarding/profile', guard(async (req, env, { user, b }) => {
    const f = await form(req);
    const country = (f.country || '').trim().toUpperCase();
    const keep = { ...b, ...f };
    if (!(f.name || '').trim()) return page(profilePage({ user, b: keep, error: 'Business name is required.' }), 400);
    if (!/^[A-Z]{2}$/.test(country)) return page(profilePage({ user, b: keep, error: 'Use a 2-letter country code, e.g. KE.' }), 400);
    await env.DB.prepare(`UPDATE businesses SET name=?, slug=?, country=?, about=?, phone=?, whatsapp=?, contact_email=?,
      onboarding_step=MAX(onboarding_step,4) WHERE id=?`)
      .bind(f.name.trim(), `${slugify(f.name)}-${b.id}`, country, f.about || null, f.phone || null, f.whatsapp || null, f.contact_email || null, b.id).run();
    return redirect('/onboarding/documents');
  })],
  ['GET', '/onboarding/documents', guard(async (req, env, { user, b }) => page(docsPage({ user, b, docs: await docs(env, b.id) })))],
  ['POST', '/onboarding/documents/upload', guard(async (req, env, { user, b }) => {
    const fd = await req.formData();
    const file = fd.get('file');
    const fail = async (error) => page(docsPage({ user, b, docs: await docs(env, b.id), error }), 400);
    if (!file || typeof file === 'string' || !file.size) return fail('Choose a file to upload.');
    if (file.size > MAX_BYTES) return fail('That file is over 5 MB.');
    if (!TYPES[file.type]) return fail('Upload a PDF, JPG or PNG.');
    const safe = file.name.replace(/[^\w.-]+/g, '_').slice(0, 80);
    const key = `${b.id}/${crypto.randomUUID()}-${safe}`;
    if (env.SUPABASE_URL) {
      const r = await fetch(`${env.SUPABASE_URL}/storage/v1/object/${env.SUPABASE_BUCKET}/${key}`, {
        method: 'POST', headers: { authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`, 'content-type': file.type }, body: file.stream(),
      });
      if (!r.ok) return fail('Upload failed. Please try again.');
    } else console.warn('[dev] SUPABASE_URL not set; document metadata saved, file not stored');
    await env.DB.prepare('INSERT INTO verification_documents (business_id,kind,filename,storage_key) VALUES (?,?,?,?)').bind(b.id, fd.get('kind') || 'other', safe, key).run();
    return redirect('/onboarding/documents');
  })],
  ['POST', '/onboarding/submit', guard(async (req, env, { user, b }) => {
    if (!b.role || !b.name) return redirect(homeFor(user, { ...b, submitted_at: null }));
    const d = await docs(env, b.id);
    if (!d.length) return page(docsPage({ user, b, docs: d, error: 'Upload at least one document before submitting.' }), 400);
    const to = ['needs_documents', 'rejected'].includes(b.status) ? transition(b.status, 'resubmit') : b.status;
    await env.DB.prepare("UPDATE businesses SET status=?, onboarding_step=5, submitted_at=datetime('now'), review_note=NULL WHERE id=?").bind(to, b.id).run();
    return redirect('/pending');
  })],
  ['GET', '/pending', guard(async (req, env, { user, b }) => page(pendingPage({ user, b })))],
];
// Suspended businesses are not 'approved', so the guard also routes them to /pending, which explains it.
