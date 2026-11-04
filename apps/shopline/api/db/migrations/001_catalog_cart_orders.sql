-- ShopLine schema: catalog, server-side carts, orders.

CREATE TABLE categories (
  id          serial PRIMARY KEY,
  slug        text NOT NULL UNIQUE,
  name        text NOT NULL,
  tagline     text NOT NULL DEFAULT '',
  sort_order  int  NOT NULL DEFAULT 0
);

CREATE TABLE products (
  id           serial PRIMARY KEY,
  slug         text NOT NULL UNIQUE,
  name         text NOT NULL,
  category_id  int  NOT NULL REFERENCES categories(id),
  price_cents  int  NOT NULL CHECK (price_cents > 0),
  description  text NOT NULL,
  details      text[] NOT NULL DEFAULT '{}',
  image        text NOT NULL,
  stock        int  NOT NULL DEFAULT 0 CHECK (stock >= 0),
  badge        text,
  featured     boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX products_category_idx ON products (category_id);

CREATE TABLE carts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE cart_items (
  cart_id     uuid NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  product_id  int  NOT NULL REFERENCES products(id),
  qty         int  NOT NULL CHECK (qty > 0 AND qty <= 20),
  added_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (cart_id, product_id)
);

CREATE TABLE orders (
  id              serial PRIMARY KEY,
  number          text NOT NULL UNIQUE,
  email           text NOT NULL,
  full_name       text NOT NULL,
  address         text NOT NULL,
  city            text NOT NULL,
  postal_code     text NOT NULL,
  country         text NOT NULL,
  subtotal_cents  int  NOT NULL,
  shipping_cents  int  NOT NULL,
  total_cents     int  NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX orders_email_idx ON orders (lower(email));

CREATE TABLE order_items (
  order_id     int  NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id   int  NOT NULL REFERENCES products(id),
  name         text NOT NULL,
  image        text NOT NULL,
  price_cents  int  NOT NULL,
  qty          int  NOT NULL CHECK (qty > 0),
  PRIMARY KEY (order_id, product_id)
);

CREATE SEQUENCE order_number_seq START 10050;
