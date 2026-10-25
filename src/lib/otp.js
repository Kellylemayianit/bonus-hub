export const OTP_TTL_MS = 60_000;
const MAX_ATTEMPTS = 5;

// Generated at the moment it is needed; one live code per user; replaced on every request.
export async function issueOtp(env, userId) {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000;
  const code = String(n).padStart(6, '0');
  const expires = new Date(Date.now() + OTP_TTL_MS).toISOString();
  await env.DB.prepare('INSERT OR REPLACE INTO otps (user_id,code,expires_at,attempts) VALUES (?,?,?,0)').bind(userId, code, expires).run();
  return { code, expires };
}
export const liveOtp = (env, userId) =>
  env.DB.prepare('SELECT code, expires_at FROM otps WHERE user_id=? AND expires_at>?').bind(userId, new Date().toISOString()).first();

// -> 'ok' | 'expired' | 'wrong' | 'locked'
export async function checkOtp(env, userId, input) {
  const row = await env.DB.prepare('SELECT * FROM otps WHERE user_id=?').bind(userId).first();
  if (!row || row.expires_at <= new Date().toISOString()) return 'expired';
  if (row.attempts >= MAX_ATTEMPTS) return 'locked';
  if ((input || '').trim() !== row.code) {
    await env.DB.prepare('UPDATE otps SET attempts=attempts+1 WHERE user_id=?').bind(userId).run();
    return 'wrong';
  }
  await env.DB.batch([
    env.DB.prepare('DELETE FROM otps WHERE user_id=?').bind(userId),
    env.DB.prepare('UPDATE users SET email_verified=1 WHERE id=?').bind(userId),
  ]);
  return 'ok';
}
