import { page, redirect, form, requireUser } from '../lib/http.js';
import { transition, STATUSES } from '../lib/state.js';
import { adminQueue } from '../templates/admin.js';

const NOTE_REQUIRED = ['reject', 'request_documents', 'suspend'];

// Cache purge hook: step 4 caches rendered public pages; approval changes must evict them at once.
async function purgePublicPages(env, b) {
  for (const path of [`/suppliers/${b.slug}`]) await caches.default.delete(new Request(`${env.APP_URL}${path}`));
}

async function load(env, filter, id) {
  const status = STATUSES.includes(filter) ? filter : 'pending';
  const rows = (await env.DB.prepare(`SELECT b.*, (SELECT COUNT(*) FROM verification_documents d WHERE d.business_id=b.id) AS doc_count
    FROM businesses b WHERE b.status=? AND b.submitted_at IS NOT NULL ORDER BY b.submitted_at`).bind(status).all()).results;
  const counts = Object.fromEntries((await env.DB.prepare('SELECT status, COUNT(*) n FROM businesses WHERE submitted_at IS NOT NULL GROUP BY status').all()).results.map((r) => [r.status, r.n]));
  const sel = id ? rows.find((r) => r.id === +id) || null : rows[0] || null;
  const docs = sel ? (await env.DB.prepare('SELECT * FROM verification_documents WHERE business_id=?').bind(sel.id).all()).results : [];
  return { status, rows, counts, sel, docs };
}

export const adminRoutes = [
  ['GET', '/admin', async (req, env) => {
    const r = await requireUser(env, req, { admin: true });
    if (r instanceof Response) return r;
    const q = new URL(req.url).searchParams;
    const d = await load(env, q.get('status'), q.get('id'));
    return page(adminQueue({ user: r.user, filter: d.status, ...d }));
  }],
  [/^POST \/admin\/business\/(\d+)$/, async (req, env, ctx, [id]) => {
    const r = await requireUser(env, req, { admin: true });
    if (r instanceof Response) return r;
    const f = await form(req);
    const b = await env.DB.prepare('SELECT b.*, u.email AS owner_email FROM businesses b JOIN users u ON u.id=b.owner_id WHERE b.id=?').bind(id).first();
    if (!b) return new Response('Not found', { status: 404 });
    const rerender = async (error) => { const d = await load(env, f.back, id); return page(adminQueue({ user: r.user, filter: d.status, ...d, error }), 400); };

    let to;
    try { to = transition(b.status, f.action); } catch (e) { return rerender('That action is not allowed from the current status.'); }
    const note = (f.note || '').trim();
    if (NOTE_REQUIRED.includes(f.action) && !note) return rerender('Add a note for the business first.');

    // Admin confirms declared capabilities when approving or reinstating.
    const confirmCaps = ['approve', 'reinstate'].includes(f.action);
    const can_sell = confirmCaps ? (f.can_sell ? 1 : 0) : b.can_sell, can_buy = confirmCaps ? (f.can_buy ? 1 : 0) : b.can_buy;
    if (to === 'approved' && !can_sell && !can_buy) return rerender('Confirm at least one capability: sell or buy.');

    await env.DB.batch([
      env.DB.prepare(`UPDATE businesses SET status=?, can_sell=?, can_buy=?, review_note=?,
        approved_at=CASE WHEN ?='approved' AND approved_at IS NULL THEN datetime('now') ELSE approved_at END WHERE id=?`)
        .bind(to, can_sell, can_buy, note || null, to, b.id),
      env.DB.prepare('INSERT INTO admin_audit_log (admin_id,business_id,action,from_status,to_status,note) VALUES (?,?,?,?,?,?)')
        .bind(r.user.id, b.id, f.action, b.status, to, note || null)
    ]);
    await purgePublicPages(env, b);
    return redirect(`/admin?status=${f.back || 'pending'}`);
  }],
  [/^GET \/admin\/doc\/(\d+)$/, async (req, env, ctx, [id]) => {
    const r = await requireUser(env, req, { admin: true });
    if (r instanceof Response) return r;
    const d = await env.DB.prepare('SELECT * FROM verification_documents WHERE id=?').bind(id).first();
    if (!d) return new Response('Not found', { status: 404 });
    if (!env.SUPABASE_URL) return new Response('Storage not configured (dev). Key: ' + d.storage_key, { status: 501 });
    const s = await fetch(`${env.SUPABASE_URL}/storage/v1/object/sign/${env.SUPABASE_BUCKET}/${d.storage_key}`, {
      method: 'POST', headers: { authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`, 'content-type': 'application/json' }, body: JSON.stringify({ expiresIn: 60 }),
    });
    if (!s.ok) return new Response('Could not sign URL', { status: 502 });
    return redirect(`${env.SUPABASE_URL}/storage/v1${(await s.json()).signedURL}`);
  }],
];
