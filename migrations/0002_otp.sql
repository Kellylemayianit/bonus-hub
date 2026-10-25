-- Just-in-time OTPs (60 s lifetime) replace emailed verification links.
CREATE TABLE otps (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0
);
DROP TABLE tokens;
DROP TABLE email_outbox;
