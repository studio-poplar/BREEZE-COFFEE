-- Breeze Coffee schema (PostgreSQL / Neon via Vercel Postgres)
--
-- IDs are generated application-side (crypto.randomUUID()), and every
-- timestamp is written explicitly from JS as an ISO 8601 string rather than
-- relying on a DB-side default — keeps every environment (this Postgres, the
-- earlier SQLite version, any future engine) behaving identically instead of
-- depending on that engine's own now()/datetime() dialect.

CREATE TABLE IF NOT EXISTS stores (
  store_id      TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  type          TEXT NOT NULL CHECK (type IN ('permanent', 'popup')),
  starts_at     TEXT,               -- ISO datetime, popup event start (null for permanent)
  ends_at       TEXT,               -- ISO datetime, popup event end (null for permanent)
  active        BOOLEAN NOT NULL DEFAULT true,
  created_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS staff (
  staff_id      TEXT PRIMARY KEY,
  username      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name  TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('admin', 'register')),
  created_at    TEXT NOT NULL
);

-- which stores a 'register' role staff member may operate; admins can access all stores
CREATE TABLE IF NOT EXISTS staff_stores (
  staff_id      TEXT NOT NULL REFERENCES staff(staff_id) ON DELETE CASCADE,
  store_id      TEXT NOT NULL REFERENCES stores(store_id) ON DELETE CASCADE,
  PRIMARY KEY (staff_id, store_id)
);

CREATE TABLE IF NOT EXISTS menu_items (
  item_id       TEXT PRIMARY KEY,
  store_id      TEXT NOT NULL REFERENCES stores(store_id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  price         INTEGER NOT NULL,
  cost_price    INTEGER NOT NULL DEFAULT 0,  -- 原価 (材料費など), for gross-margin reporting
  category      TEXT NOT NULL DEFAULT '',
  image_path    TEXT,
  active        BOOLEAN NOT NULL DEFAULT true,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL
);

-- ADD COLUMN's inline default above only backfills brand-new tables; widen an
-- already-existing one too. Safe to run repeatedly.
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS cost_price INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS option_groups (
  group_id      TEXT PRIMARY KEY,
  item_id       TEXT NOT NULL REFERENCES menu_items(item_id) ON DELETE CASCADE,
  label         TEXT NOT NULL,
  required      BOOLEAN NOT NULL DEFAULT false,
  multi_select  BOOLEAN NOT NULL DEFAULT false,
  sort_order    INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS option_choices (
  choice_id     TEXT PRIMARY KEY,
  group_id      TEXT NOT NULL REFERENCES option_groups(group_id) ON DELETE CASCADE,
  label         TEXT NOT NULL,
  extra_price   INTEGER NOT NULL DEFAULT 0,
  sort_order    INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS customers (
  customer_id   TEXT PRIMARY KEY,
  line_user_id  TEXT NOT NULL UNIQUE,
  display_name  TEXT NOT NULL,
  picture_url   TEXT,
  created_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS orders (
  order_id        TEXT PRIMARY KEY,
  order_token     TEXT NOT NULL UNIQUE,
  store_id        TEXT NOT NULL REFERENCES stores(store_id),
  customer_id     TEXT NOT NULL REFERENCES customers(customer_id),
  status          TEXT NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'paid', 'served')),
  payment_method  TEXT CHECK (payment_method IN ('cash', 'card', 'emoney', 'qr')),
  total_price     INTEGER NOT NULL,
  created_at      TEXT NOT NULL,
  paid_at         TEXT,
  served_at       TEXT
);

-- CREATE TABLE's inline CHECK above only applies to a brand-new table; widen
-- it on an already-existing one too (added when 電子マネー/QRコード決済
-- joined 現金/カード as payment options). Safe to run repeatedly.
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_method_check;
ALTER TABLE orders ADD CONSTRAINT orders_payment_method_check
  CHECK (payment_method IN ('cash', 'card', 'emoney', 'qr'));

CREATE TABLE IF NOT EXISTS order_items (
  order_item_id     TEXT PRIMARY KEY,
  order_id          TEXT NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
  item_id           TEXT NOT NULL REFERENCES menu_items(item_id),
  item_name_snapshot TEXT NOT NULL,
  unit_price        INTEGER NOT NULL,
  qty               INTEGER NOT NULL,
  selected_options  TEXT NOT NULL DEFAULT '[]' -- JSON: [{groupLabel, choiceLabel, extraPrice}]
);

-- cost for profitability reports is looked up live from menu_items.cost_price
-- (see src/lib/data/sales.ts) rather than frozen per order, so a per-line
-- snapshot column isn't needed; drop it if an earlier migration added one.
ALTER TABLE order_items DROP COLUMN IF EXISTS cost_price_snapshot;

CREATE TABLE IF NOT EXISTS serve_records (
  order_item_id   TEXT PRIMARY KEY REFERENCES order_items(order_item_id) ON DELETE CASCADE,
  served_options  TEXT NOT NULL DEFAULT '[]', -- JSON, actual served content (may differ from ordered)
  served_by       TEXT REFERENCES staff(staff_id),
  served_at       TEXT NOT NULL
);

-- "いつもの" (usual order) is a customer x drink-recipe preference, not tied to
-- one store's menu row: item_name is what we match against each store's
-- current menu on display, since the same drink is a separate menu_items row
-- per store. item_id is kept only as a hint for prefilling admin/debugging.
CREATE TABLE IF NOT EXISTS favorites (
  favorite_id       TEXT PRIMARY KEY,
  customer_id       TEXT NOT NULL REFERENCES customers(customer_id) ON DELETE CASCADE,
  item_id           TEXT,
  item_name         TEXT NOT NULL,
  label             TEXT NOT NULL,
  selected_options  TEXT NOT NULL DEFAULT '[]',
  created_at        TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_menu_items_store ON menu_items(store_id);
CREATE INDEX IF NOT EXISTS idx_option_groups_item ON option_groups(item_id);
CREATE INDEX IF NOT EXISTS idx_option_choices_group ON option_choices(group_id);
CREATE INDEX IF NOT EXISTS idx_orders_store ON orders(store_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_favorites_customer ON favorites(customer_id);
