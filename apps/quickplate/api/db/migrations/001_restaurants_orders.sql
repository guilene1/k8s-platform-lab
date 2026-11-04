-- QuickPlate schema: restaurants, menus, delivery orders.

CREATE TABLE restaurants (
  id                 serial PRIMARY KEY,
  slug               text NOT NULL UNIQUE,
  name               text NOT NULL,
  cuisine            text NOT NULL,
  tagline            text NOT NULL,
  neighborhood       text NOT NULL,
  image              text NOT NULL,
  rating             numeric(2,1) NOT NULL,
  review_count       int  NOT NULL,
  prep_minutes       int  NOT NULL,
  delivery_fee_cents int  NOT NULL,
  min_order_cents    int  NOT NULL,
  price_level        int  NOT NULL CHECK (price_level BETWEEN 1 AND 3),
  sort_order         int  NOT NULL DEFAULT 0
);

CREATE TABLE menu_items (
  id             serial PRIMARY KEY,
  restaurant_id  int  NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  slug           text NOT NULL,
  section        text NOT NULL,
  name           text NOT NULL,
  description    text NOT NULL,
  price_cents    int  NOT NULL CHECK (price_cents > 0),
  popular        boolean NOT NULL DEFAULT false,
  vegetarian     boolean NOT NULL DEFAULT false,
  spicy          boolean NOT NULL DEFAULT false,
  sort_order     int     NOT NULL DEFAULT 0,
  UNIQUE (restaurant_id, slug)
);

CREATE TABLE orders (
  id                 serial PRIMARY KEY,
  code               text NOT NULL UNIQUE,
  restaurant_id      int  NOT NULL REFERENCES restaurants(id),
  customer_name      text NOT NULL,
  address            text NOT NULL,
  notes              text NOT NULL DEFAULT '',
  subtotal_cents     int  NOT NULL,
  delivery_fee_cents int  NOT NULL,
  service_fee_cents  int  NOT NULL,
  tip_cents          int  NOT NULL DEFAULT 0,
  total_cents        int  NOT NULL,
  eta_minutes        int  NOT NULL,
  courier            text NOT NULL,
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE order_items (
  order_id      int NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id  int NOT NULL REFERENCES menu_items(id),
  name          text NOT NULL,
  price_cents   int NOT NULL,
  qty           int NOT NULL CHECK (qty BETWEEN 1 AND 20),
  PRIMARY KEY (order_id, menu_item_id)
);
