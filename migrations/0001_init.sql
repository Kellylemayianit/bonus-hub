PRAGMA foreign_keys = ON;

CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  email_verified INTEGER NOT NULL DEFAULT 0,
  is_admin INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL
);
CREATE TABLE tokens (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE TABLE businesses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id INTEGER NOT NULL UNIQUE REFERENCES users(id),
  name TEXT,
  slug TEXT UNIQUE,
  role TEXT CHECK (role IN ('manufacturer','supplier','wholesaler')),
  can_sell INTEGER NOT NULL DEFAULT 0,
  can_buy INTEGER NOT NULL DEFAULT 0,
  country TEXT,
  about TEXT,
  phone TEXT, whatsapp TEXT, contact_email TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','needs_documents','approved','rejected','suspended')),
  onboarding_step INTEGER NOT NULL DEFAULT 2,
  review_note TEXT,
  submitted_at TEXT,
  approved_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_businesses_status ON businesses(status);
CREATE INDEX idx_businesses_country ON businesses(country);

CREATE TABLE verification_documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  filename TEXT NOT NULL,
  storage_key TEXT NOT NULL,
  uploaded_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_docs_business ON verification_documents(business_id);

CREATE TABLE categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  parent_id INTEGER REFERENCES categories(id),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE
);

CREATE TABLE products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  business_id INTEGER NOT NULL REFERENCES businesses(id),
  category_id INTEGER REFERENCES categories(id),
  title TEXT NOT NULL,
  description TEXT,
  price INTEGER,
  currency TEXT NOT NULL DEFAULT 'KES',
  unit TEXT NOT NULL,
  min_order_qty INTEGER,
  country TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_products_business ON products(business_id);
CREATE INDEX idx_products_category ON products(category_id, active);
CREATE VIRTUAL TABLE products_fts USING fts5(title, description, content='products', content_rowid='id');
CREATE TRIGGER products_ai AFTER INSERT ON products BEGIN
  INSERT INTO products_fts(rowid,title,description) VALUES (new.id,new.title,new.description);
END;
CREATE TRIGGER products_ad AFTER DELETE ON products BEGIN
  INSERT INTO products_fts(products_fts,rowid,title,description) VALUES('delete',old.id,old.title,old.description);
END;
CREATE TRIGGER products_au AFTER UPDATE ON products BEGIN
  INSERT INTO products_fts(products_fts,rowid,title,description) VALUES('delete',old.id,old.title,old.description);
  INSERT INTO products_fts(rowid,title,description) VALUES (new.id,new.title,new.description);
END;

CREATE TABLE product_images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  cloudinary_id TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  business_id INTEGER NOT NULL REFERENCES businesses(id),
  category_id INTEGER REFERENCES categories(id),
  title TEXT NOT NULL,
  details TEXT,
  quantity INTEGER, unit TEXT,
  country TEXT,
  visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public','private')),
  status TEXT NOT NULL DEFAULT 'open',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE request_recipients (
  request_id INTEGER NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  business_id INTEGER NOT NULL REFERENCES businesses(id),
  PRIMARY KEY (request_id, business_id)
);

CREATE TABLE threads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  buyer_id INTEGER NOT NULL REFERENCES businesses(id),
  seller_id INTEGER NOT NULL REFERENCES businesses(id),
  product_id INTEGER REFERENCES products(id),
  request_id INTEGER REFERENCES requests(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  thread_id INTEGER NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  sender_id INTEGER NOT NULL REFERENCES businesses(id),
  body TEXT NOT NULL,
  flagged_payment INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_messages_thread ON messages(thread_id, id);

CREATE TABLE reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reporter_id INTEGER NOT NULL REFERENCES businesses(id),
  target_business_id INTEGER REFERENCES businesses(id),
  thread_id INTEGER REFERENCES threads(id),
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE admin_audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_id INTEGER NOT NULL REFERENCES users(id),
  business_id INTEGER REFERENCES businesses(id),
  action TEXT NOT NULL,
  from_status TEXT, to_status TEXT,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE email_outbox (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  sent_at TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_outbox_unsent ON email_outbox(sent_at);
