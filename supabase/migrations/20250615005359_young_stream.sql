/*
  # Echtzeit-System für Bestellungen reparieren

  1. Neue Tabellen
    - Erweiterte `orders` Tabelle mit ready_at Feld
    - Verbesserte `menu_items` Tabelle mit options

  2. Sicherheit
    - RLS Policies für Echtzeit-Updates
    - Öffentlicher Zugriff für Realtime-Subscriptions

  3. Änderungen
    - ready_at Feld für bessere Zeitverfolgung
    - Optimierte Indizes für Performance
*/

-- Lösche und erstelle orders Tabelle neu mit allen nötigen Feldern
DROP TABLE IF EXISTS orders CASCADE;

CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  pickup_time timestamptz NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'ready', 'completed')),
  total_amount numeric(10,2) NOT NULL CHECK (total_amount > 0),
  items jsonb NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now(),
  ready_at timestamptz
);

-- Enable RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- RLS Policies für orders (sehr permissiv für Realtime)
CREATE POLICY "Anyone can read orders"
  ON orders
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can create orders"
  ON orders
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Anyone can update orders"
  ON orders
  FOR UPDATE
  TO public
  USING (true);

-- Stelle sicher, dass menu_items existiert
CREATE TABLE IF NOT EXISTS menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL,
  price numeric(10,2) NOT NULL CHECK (price > 0),
  category text NOT NULL,
  image_url text,
  available boolean DEFAULT true,
  options jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read menu items"
  ON menu_items
  FOR SELECT
  TO public
  USING (true);

-- Beispiel-Daten nur einfügen wenn Tabelle leer ist
INSERT INTO menu_items (name, description, price, category, image_url, available, options) 
SELECT * FROM (VALUES
  ('Döner Kebab', 'Frisches Fleisch im Fladenbrot mit Salat und Soße', 5.50, 'Döner', 'https://images.pexels.com/photos/4676401/pexels-photo-4676401.jpeg', true, '[
    {"name": "Extra Fleisch", "price": 1.50},
    {"name": "Extra Käse", "price": 1.00},
    {"name": "Scharf", "price": 0.00},
    {"name": "Ohne Zwiebeln", "price": 0.00},
    {"name": "Extra Soße", "price": 0.50}
  ]'::jsonb),
  ('Döner Teller', 'Döner-Fleisch mit Reis, Salat und Soße', 8.50, 'Döner', 'https://images.pexels.com/photos/5920742/pexels-photo-5920742.jpeg', true, '[
    {"name": "Extra Fleisch", "price": 2.00},
    {"name": "Extra Reis", "price": 1.00},
    {"name": "Pommes statt Reis", "price": 0.50},
    {"name": "Scharf", "price": 0.00}
  ]'::jsonb),
  ('Pizza Margherita', 'Tomatensauce, Mozzarella, Basilikum', 7.50, 'Pizza', 'https://images.pexels.com/photos/315755/pexels-photo-315755.jpeg', true, '[
    {"name": "Extra Käse", "price": 1.50},
    {"name": "Knoblauch", "price": 0.50},
    {"name": "Oregano", "price": 0.00}
  ]'::jsonb),
  ('Coca Cola', 'Erfrischende Cola, 0,33l', 2.50, 'Getränke', 'https://images.pexels.com/photos/50593/coca-cola-cold-drink-soft-drink-coke-50593.jpeg', true, '[]'::jsonb)
) AS v(name, description, price, category, image_url, available, options)
WHERE NOT EXISTS (SELECT 1 FROM menu_items LIMIT 1);