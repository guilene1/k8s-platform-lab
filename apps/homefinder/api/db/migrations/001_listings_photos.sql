-- HomeFinder schema: listings, their photos (files on EFS), saved homes.

CREATE TABLE listings (
  id            serial PRIMARY KEY,
  slug          text NOT NULL UNIQUE,
  title         text NOT NULL,
  address       text NOT NULL,
  city          text NOT NULL,
  neighborhood  text NOT NULL,
  property_type text NOT NULL CHECK (property_type IN ('house', 'townhouse', 'condo', 'loft', 'cottage')),
  price_cents   bigint NOT NULL CHECK (price_cents > 0),
  beds          int  NOT NULL CHECK (beds >= 0),
  baths         numeric(3,1) NOT NULL CHECK (baths >= 0),
  sqft          int  NOT NULL CHECK (sqft > 0),
  year_built    int,
  description   text NOT NULL,
  features      text[] NOT NULL DEFAULT '{}',
  agent_name    text NOT NULL,
  status        text NOT NULL DEFAULT 'for_sale' CHECK (status IN ('for_sale', 'pending', 'sold')),
  listed_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX listings_city_idx ON listings (city);

-- Photo files live on the shared EFS volume under <UPLOAD_DIR>/photos.
CREATE TABLE photos (
  id           serial PRIMARY KEY,
  listing_id   int  NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  file         text NOT NULL,
  caption      text NOT NULL DEFAULT '',
  source       text NOT NULL DEFAULT 'upload' CHECK (source IN ('seed', 'upload')),
  position     int  NOT NULL DEFAULT 100,
  bytes        int,
  uploaded_by  text,
  uploaded_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (listing_id, file)
);

CREATE TABLE saved_homes (
  visitor_id  uuid NOT NULL,
  listing_id  int  NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  saved_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (visitor_id, listing_id)
);
